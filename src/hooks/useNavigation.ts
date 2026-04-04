import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';

export interface NavStep {
  instructions: string;
  distance: string;
  duration: string;
  maneuver: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export interface NavState {
  isNavigating: boolean;
  steps: NavStep[];
  currentStepIndex: number;
  currentLat: number | null;
  currentLng: number | null;
  distanceToNext: string;
  remainingDuration: string;
  remainingDistance: string;
  heading: number;
  isOffRoute: boolean;
  navDirectionsResult: google.maps.DirectionsResult | null;
}

export interface UseNavigationReturn extends NavState {
  startNavigation: (
    mapRef: React.RefObject<google.maps.Map | null>
  ) => void;
  stopNavigation: () => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtM(m: number): string {
  if (m < 950) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function fmtSec(s: number): string {
  if (s < 60)   return '< 1 min';
  if (s < 3600) return `${Math.round(s / 60)} min`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

function extractSteps(result: google.maps.DirectionsResult): NavStep[] {
  const leg = result.routes[0]?.legs[0];
  if (!leg) return [];
  return leg.steps.map((s) => ({
    instructions: s.instructions ?? '',
    distance:     s.distance?.text ?? '',
    duration:     s.duration?.text ?? '',
    maneuver:     (s as any).maneuver ?? '',
    startLat:     s.start_location.lat(),
    startLng:     s.start_location.lng(),
    endLat:       s.end_location.lat(),
    endLng:       s.end_location.lng(),
  }));
}

function sumRemaining(result: google.maps.DirectionsResult, fromStep: number, field: 'duration' | 'distance'): number {
  return (result.routes[0]?.legs[0]?.steps ?? [])
    .slice(fromStep)
    .reduce((acc, s) => acc + ((field === 'duration' ? s.duration?.value : s.distance?.value) ?? 0), 0);
}

// ─── fetch directions helper ──────────────────────────────────────────────────

function fetchNavDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  travelMode: google.maps.TravelMode,
  callback: (result: google.maps.DirectionsResult) => void,
  onError?: () => void
) {
  const svc = new window.google.maps.DirectionsService();
  svc.route(
    {
      origin: { lat: originLat, lng: originLng },
      destination: { lat: destLat, lng: destLng },
      travelMode,
      provideRouteAlternatives: false,
    },
    (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK && result) {
        callback(result);
      } else {
        console.warn('[Nav] Directions re-fetch failed:', status);
        onError?.();
      }
    }
  );
}

// ─── constants ────────────────────────────────────────────────────────────────

const REROUTE_DIST_M   = 80;   // trigger reroute if > 80 m off nearest step
const REROUTE_DEBOUNCE = 15_000; // minimum ms between auto-reroutes
const STEP_ADVANCE_M   = 25;   // advance step when within 25 m of its endpoint
const GPS_THROTTLE_MS  = 1_000;

const INITIAL: NavState = {
  isNavigating:       false,
  steps:              [],
  currentStepIndex:   0,
  currentLat:         null,
  currentLng:         null,
  distanceToNext:     '',
  remainingDuration:  '',
  remainingDistance:  '',
  heading:            0,
  isOffRoute:         false,
  navDirectionsResult: null,
};

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useNavigation(): UseNavigationReturn {
  const [state, setState]       = useState<NavState>(INITIAL);
  const watchIdRef              = useRef<number | null>(null);
  const lastGpsRef              = useRef(0);
  const lastRerouteRef          = useRef(0);
  const headingRef              = useRef(0);
  const mapRefInternal          = useRef<google.maps.Map | null>(null);
  // keeps latest nav result + steps in refs so GPS callback never has stale closure
  const navResultRef            = useRef<google.maps.DirectionsResult | null>(null);
  const stepsRef                = useRef<NavStep[]>([]);
  const stepIndexRef            = useRef(0);
  const destRef                 = useRef<{ lat: number; lng: number } | null>(null);
  const travelModeRef           = useRef<google.maps.TravelMode>(window.google?.maps?.TravelMode?.DRIVING ?? ('DRIVING' as any));

  const stopNavigation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    navResultRef.current = null;
    stepsRef.current     = [];
    setState(INITIAL);
  }, []);

  /** Apply a fresh DirectionsResult to state + refs */
  const applyNavResult = useCallback((result: google.maps.DirectionsResult, fromStep = 0) => {
    const steps = extractSteps(result);
    navResultRef.current = result;
    stepsRef.current     = steps;
    stepIndexRef.current = fromStep;

    setState((prev) => ({
      ...prev,
      steps,
      currentStepIndex:  fromStep,
      navDirectionsResult: result,
      remainingDuration: fmtSec(sumRemaining(result, fromStep, 'duration')),
      remainingDistance: fmtM(sumRemaining(result, fromStep, 'distance')),
      distanceToNext:    steps[fromStep]?.distance ?? '',
      isOffRoute:        false,
    }));
  }, []);

  const startNavigation = useCallback(
    (mapRef: React.RefObject<google.maps.Map | null>) => {
      if (!navigator.geolocation) {
        console.warn('[Nav] Geolocation unavailable');
        return;
      }

      mapRefInternal.current = mapRef.current;

      // Read destination from the global navigation store
      const { endLocation, travelMode } = useNavigationStore.getState();
      if (!endLocation) {
        console.warn('[Nav] No destination set');
        return;
      }

      destRef.current = { lat: endLocation.lat, lng: endLocation.lng };

      // Map store travelMode string → google.maps.TravelMode enum
      const gmMode: Partial<Record<string, google.maps.TravelMode>> = {
        DRIVING:   window.google.maps.TravelMode.DRIVING,
        WALKING:   window.google.maps.TravelMode.WALKING,
        BICYCLING: window.google.maps.TravelMode.BICYCLING,
        // TWO_WHEELER is an undocumented extension — use DRIVING as fallback
        TWO_WHEELER: window.google.maps.TravelMode.DRIVING,
      };
      travelModeRef.current = gmMode[travelMode] ?? window.google.maps.TravelMode.DRIVING;

      // Mark navigating immediately so UI responds
      setState((prev) => ({ ...prev, isNavigating: true }));

      // Get ONE-SHOT current position to use as origin for initial route fetch
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const originLat = pos.coords.latitude;
          const originLng = pos.coords.longitude;

          fetchNavDirections(
            originLat, originLng,
            endLocation.lat, endLocation.lng,
            travelModeRef.current,
            (result) => {
              applyNavResult(result, 0);

              // Pan to user position at nav zoom
              if (mapRef.current) {
                mapRef.current.panTo({ lat: originLat, lng: originLng });
                mapRef.current.setZoom(17);
              }

              // ── Start GPS watch ────────────────────────────────────────
              watchIdRef.current = navigator.geolocation.watchPosition(
                (watchPos) => {
                  const now = Date.now();
                  if (now - lastGpsRef.current < GPS_THROTTLE_MS) return;
                  lastGpsRef.current = now;

                  const lat     = watchPos.coords.latitude;
                  const lng     = watchPos.coords.longitude;
                  const heading = watchPos.coords.heading ?? headingRef.current;
                  if (heading !== null && !isNaN(heading)) headingRef.current = heading;

                  const currentSteps = stepsRef.current;
                  if (!currentSteps.length) return;

                  // ── Step advancement ──────────────────────────────────────
                  let idx      = stepIndexRef.current;
                  let bestDist = Infinity;
                  for (let i = idx; i < Math.min(idx + 4, currentSteps.length); i++) {
                    const d = haversineM(lat, lng, currentSteps[i].endLat, currentSteps[i].endLng);
                    if (d < bestDist) { bestDist = d; }
                    if (d < STEP_ADVANCE_M) { idx = Math.min(i + 1, currentSteps.length - 1); }
                  }
                  stepIndexRef.current = idx;

                  // Distance to next checkpoint
                  const nextStep = currentSteps[idx];
                  const distNext = nextStep ? haversineM(lat, lng, nextStep.endLat, nextStep.endLng) : 0;

                  // ── Off-route detection ───────────────────────────────────
                  const nearestDist = Math.min(
                    ...currentSteps.slice(idx, idx + 5).map((s) =>
                      Math.min(
                        haversineM(lat, lng, s.startLat, s.startLng),
                        haversineM(lat, lng, s.endLat,   s.endLng)
                      )
                    )
                  );
                  const isOffRoute = nearestDist > REROUTE_DIST_M;

                  // ── Auto-reroute when off-route ───────────────────────────
                  if (isOffRoute && now - lastRerouteRef.current > REROUTE_DEBOUNCE && destRef.current) {
                    lastRerouteRef.current = now;
                    fetchNavDirections(
                      lat, lng,
                      destRef.current.lat, destRef.current.lng,
                      travelModeRef.current,
                      (freshResult) => applyNavResult(freshResult, 0)
                    );
                  }

                  const navResult = navResultRef.current;

                  setState((prev) => ({
                    ...prev,
                    currentLat:        lat,
                    currentLng:        lng,
                    currentStepIndex:  idx,
                    distanceToNext:    fmtM(distNext),
                    remainingDuration: navResult ? fmtSec(sumRemaining(navResult, idx, 'duration')) : prev.remainingDuration,
                    remainingDistance: navResult ? fmtM(sumRemaining(navResult, idx, 'distance'))  : prev.remainingDistance,
                    heading:           headingRef.current,
                    isOffRoute,
                  }));

                  // Pan map
                  const map = mapRefInternal.current ?? mapRef.current;
                  if (map) map.panTo({ lat, lng });
                },
                (err) => console.error('[Nav] GPS watch error:', err),
                { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
              );
            }
          );
        },
        (err) => {
          console.error('[Nav] Initial GPS fix failed:', err);
          setState(INITIAL);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    },
    [applyNavResult]
  );

  useEffect(() => () => stopNavigation(), [stopNavigation]);

  return { ...state, startNavigation, stopNavigation };
}
