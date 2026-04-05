import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { GPSSimulator } from '../utils/routeSimulator';
import {
  buildRouteSegments,
  cloneDirectionsWithRoute,
  extractRoutePath,
  type RoutePoint,
} from '../utils/routePath';

export interface NavStep {
  instructions: string;
  distance: string;
  distanceValue: number;
  duration: string;
  durationValue: number;
  maneuver: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

interface RouteProgressMeta {
  routePath: RoutePoint[];
  cumulativeDistances: number[];
  stepEndDistances: number[];
  totalDistance: number;
}

export interface NavState {
  isNavigating: boolean;
  steps: NavStep[];
  currentStepIndex: number;
  currentLat: number | null;
  currentLng: number | null;
  progressDistanceMeters: number;
  distanceToNext: string;
  remainingDuration: string;
  remainingDistance: string;
  heading: number;
  isOffRoute: boolean;
  navDirectionsResult: google.maps.DirectionsResult | null;
}

export interface UseNavigationReturn extends NavState {
  startNavigation: (mapRef: React.RefObject<google.maps.Map | null>) => void;
  stopNavigation: () => void;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusM = 6_371_000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;

  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const bearing = Math.atan2(y, x) * (180 / Math.PI);

  return (bearing + 360) % 360;
}

function fmtM(distanceM: number): string {
  if (distanceM < 950) return `${Math.round(distanceM / 10) * 10} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

function fmtSec(durationSec: number): string {
  if (durationSec < 60) return '< 1 min';
  if (durationSec < 3600) return `${Math.round(durationSec / 60)} min`;

  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.round((durationSec % 3600) / 60);
  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function extractSteps(result: google.maps.DirectionsResult): NavStep[] {
  const leg = result.routes[0]?.legs[0];
  if (!leg) return [];

  return leg.steps.map((step) => ({
    instructions: step.instructions ?? '',
    distance: step.distance?.text ?? '',
    distanceValue: step.distance?.value ?? 0,
    duration: step.duration?.text ?? '',
    durationValue: step.duration?.value ?? 0,
    maneuver: (step as google.maps.DirectionsStep & { maneuver?: string }).maneuver ?? '',
    startLat: step.start_location.lat(),
    startLng: step.start_location.lng(),
    endLat: step.end_location.lat(),
    endLng: step.end_location.lng(),
  }));
}

function projectPointOntoSegment(point: RoutePoint, start: RoutePoint, end: RoutePoint) {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  const segmentLengthSquared = dx * dx + dy * dy;

  if (segmentLengthSquared === 0) {
    return {
      projectedPoint: start,
      t: 0,
    };
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) / segmentLengthSquared
    )
  );

  return {
    projectedPoint: {
      lat: start.lat + dy * t,
      lng: start.lng + dx * t,
    },
    t,
  };
}

function projectDistanceAlongRoute(
  routePath: RoutePoint[],
  cumulativeDistances: number[],
  point: RoutePoint
) {
  if (routePath.length === 0) {
    return {
      distanceAlongRoute: 0,
      distanceFromRoute: Number.POSITIVE_INFINITY,
    };
  }

  if (routePath.length === 1) {
    return {
      distanceAlongRoute: 0,
      distanceFromRoute: haversineM(
        point.lat,
        point.lng,
        routePath[0].lat,
        routePath[0].lng
      ),
    };
  }

  let bestDistanceAlongRoute = 0;
  let bestDistanceFromRoute = Number.POSITIVE_INFINITY;

  for (let index = 0; index < routePath.length - 1; index += 1) {
    const start = routePath[index];
    const end = routePath[index + 1];
    const segmentDistance = haversineM(start.lat, start.lng, end.lat, end.lng);
    const projection = projectPointOntoSegment(point, start, end);
    const distanceFromRoute = haversineM(
      point.lat,
      point.lng,
      projection.projectedPoint.lat,
      projection.projectedPoint.lng
    );

    if (distanceFromRoute < bestDistanceFromRoute) {
      bestDistanceFromRoute = distanceFromRoute;
      bestDistanceAlongRoute = (cumulativeDistances[index] ?? 0) + (segmentDistance * projection.t);
    }
  }

  return {
    distanceAlongRoute: bestDistanceAlongRoute,
    distanceFromRoute: bestDistanceFromRoute,
  };
}

function buildRouteProgress(result: google.maps.DirectionsResult): RouteProgressMeta | null {
  const route = result.routes[0];
  const leg = route?.legs[0];
  if (!route || !leg) {
    return null;
  }

  const routePath = extractRoutePath(route);
  if (!routePath.length) {
    return null;
  }

  const cumulativeDistances = [0];
  for (let index = 1; index < routePath.length; index += 1) {
    const previousPoint = routePath[index - 1];
    const point = routePath[index];
    cumulativeDistances.push(
      cumulativeDistances[index - 1] +
        haversineM(previousPoint.lat, previousPoint.lng, point.lat, point.lng)
    );
  }

  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1] ?? 0;
  let previousEndDistance = 0;
  const stepEndDistances = leg.steps.map((step) => {
    const projected = projectDistanceAlongRoute(routePath, cumulativeDistances, {
      lat: step.end_location.lat(),
      lng: step.end_location.lng(),
    });
    const endDistance = Math.max(previousEndDistance, projected.distanceAlongRoute);
    previousEndDistance = endDistance;
    return endDistance;
  });

  return {
    routePath,
    cumulativeDistances,
    stepEndDistances,
    totalDistance,
  };
}

function sumRemaining(
  result: google.maps.DirectionsResult,
  fromStep: number,
  field: 'duration' | 'distance'
) {
  return (result.routes[0]?.legs[0]?.steps ?? [])
    .slice(fromStep)
    .reduce((total, step) => {
      const value = field === 'duration' ? step.duration?.value : step.distance?.value;
      return total + (value ?? 0);
    }, 0);
}

function fetchNavDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  travelMode: google.maps.TravelMode,
  callback: (result: google.maps.DirectionsResult) => void,
  onError?: () => void
) {
  const service = new window.google.maps.DirectionsService();
  service.route(
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

const REROUTE_DIST_M = 100;
const REROUTE_DEBOUNCE_MS = 15_000;
const STEP_COMPLETE_BUFFER_M = 10;
const SIMULATION_TICK_MS = 50;

const INITIAL: NavState = {
  isNavigating: false,
  steps: [],
  currentStepIndex: 0,
  currentLat: null,
  currentLng: null,
  progressDistanceMeters: 0,
  distanceToNext: '',
  remainingDuration: '',
  remainingDistance: '',
  heading: 0,
  isOffRoute: false,
  navDirectionsResult: null,
};

export function useNavigation(): UseNavigationReturn {
  const [state, setState] = useState<NavState>(INITIAL);
  const watchIdRef = useRef<number | null>(null);
  const lastRerouteRef = useRef(0);
  const headingRef = useRef(0);
  const mapRefInternal = useRef<google.maps.Map | null>(null);
  const navResultRef = useRef<google.maps.DirectionsResult | null>(null);
  const routeProgressRef = useRef<RouteProgressMeta | null>(null);
  const stepsRef = useRef<NavStep[]>([]);
  const stepIndexRef = useRef(0);
  const destRef = useRef<{ lat: number; lng: number } | null>(null);
  const travelModeRef = useRef<google.maps.TravelMode>(
    window.google?.maps?.TravelMode?.DRIVING ?? ('DRIVING' as google.maps.TravelMode)
  );
  const simulatorRef = useRef<GPSSimulator | null>(null);
  const simulatorTimerRef = useRef<number | null>(null);
  const lastSimulatorUpdateRef = useRef(0);

  const clearSimulation = useCallback(() => {
    if (simulatorTimerRef.current !== null) {
      window.clearInterval(simulatorTimerRef.current);
      simulatorTimerRef.current = null;
    }

    simulatorRef.current = null;
    useNavigationStore.setState({ isSimulationRunning: false });
  }, []);

  const finishNavigation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    clearSimulation();
    
    // Partially reset local state to unmount Nav UI from map
    setState(previous => ({
      ...previous,
      isNavigating: false,
      currentStepIndex: 0,
      progressDistanceMeters: 0,
    }));

    useNavigationStore.setState({ showTripSummary: true });
  }, [clearSimulation]);

  const stopNavigation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    clearSimulation();
    navResultRef.current = null;
    routeProgressRef.current = null;
    stepsRef.current = [];
    stepIndexRef.current = 0;
    destRef.current = null;
    setState(INITIAL);
  }, [clearSimulation]);

  const applyNavResult = useCallback((result: google.maps.DirectionsResult, fromStep = 0) => {
    const steps = extractSteps(result);
    navResultRef.current = result;
    routeProgressRef.current = buildRouteProgress(result);
    stepsRef.current = steps;
    stepIndexRef.current = fromStep;

    setState((previous) => ({
      ...previous,
      isNavigating: true,
      steps,
      currentStepIndex: fromStep,
      navDirectionsResult: result,
      progressDistanceMeters: 0,
      remainingDuration: fmtSec(sumRemaining(result, fromStep, 'duration')),
      remainingDistance: fmtM(sumRemaining(result, fromStep, 'distance')),
      distanceToNext: steps[fromStep]?.distance ?? '',
      isOffRoute: false,
    }));
  }, []);

  const processPositionUpdate = useCallback((
    lat: number,
    lng: number,
    heading = 0,
    progressDistanceOverride?: number
  ) => {
    headingRef.current = heading || headingRef.current;

    const currentSteps = stepsRef.current;
    if (!currentSteps.length) return;

    const routeProgress = routeProgressRef.current;
    const projectedProgress = routeProgress
      ? (
          progressDistanceOverride != null
            ? {
                distanceAlongRoute: progressDistanceOverride,
                distanceFromRoute: 0,
              }
            : projectDistanceAlongRoute(routeProgress.routePath, routeProgress.cumulativeDistances, { lat, lng })
        )
      : null;
    const currentProgressDistance = projectedProgress?.distanceAlongRoute ?? progressDistanceOverride ?? 0;

    let nextStepIndex = stepIndexRef.current;
    let distanceToNextMeters = 0;
    let remainingDistanceMeters = 0;
    let remainingDurationSeconds = 0;
    let isOffRoute = false;

    if (routeProgress && projectedProgress) {
      const progressDistance = Math.min(
        Math.max(projectedProgress.distanceAlongRoute, 0),
        routeProgress.totalDistance
      );

      nextStepIndex = routeProgress.stepEndDistances.findIndex(
        (stepEndDistance) => progressDistance < stepEndDistance - STEP_COMPLETE_BUFFER_M
      );

      if (nextStepIndex === -1) {
        nextStepIndex = Math.max(currentSteps.length - 1, 0);
      }

      const previousStepEndDistance =
        nextStepIndex > 0 ? routeProgress.stepEndDistances[nextStepIndex - 1] ?? 0 : 0;
      const currentStepEndDistance =
        routeProgress.stepEndDistances[nextStepIndex] ?? routeProgress.totalDistance;
      const currentStepDistance = Math.max(
        currentStepEndDistance - previousStepEndDistance,
        currentSteps[nextStepIndex]?.distanceValue ?? 0
      );
      const currentStepDuration = currentSteps[nextStepIndex]?.durationValue ?? 0;

      distanceToNextMeters = Math.max(0, currentStepEndDistance - progressDistance);
      remainingDistanceMeters = distanceToNextMeters;
      remainingDurationSeconds =
        currentStepDistance > 0
          ? (distanceToNextMeters / currentStepDistance) * currentStepDuration
          : currentStepDuration;

      for (let index = nextStepIndex + 1; index < currentSteps.length; index += 1) {
        remainingDistanceMeters += currentSteps[index].distanceValue;
        remainingDurationSeconds += currentSteps[index].durationValue;
      }

      isOffRoute =
        progressDistanceOverride == null && projectedProgress.distanceFromRoute > REROUTE_DIST_M;
    } else {
      const nextStep = currentSteps[nextStepIndex];
      distanceToNextMeters = nextStep
        ? haversineM(lat, lng, nextStep.endLat, nextStep.endLng)
        : 0;

      remainingDistanceMeters = distanceToNextMeters;
      remainingDurationSeconds =
        nextStep && nextStep.distanceValue > 0
          ? (distanceToNextMeters / nextStep.distanceValue) * nextStep.durationValue
          : nextStep?.durationValue ?? 0;

      for (let index = nextStepIndex + 1; index < currentSteps.length; index += 1) {
        remainingDistanceMeters += currentSteps[index].distanceValue;
        remainingDurationSeconds += currentSteps[index].durationValue;
      }
    }

    stepIndexRef.current = nextStepIndex;

    const now = Date.now();
    if (
      isOffRoute &&
      now - lastRerouteRef.current > REROUTE_DEBOUNCE_MS &&
      destRef.current
    ) {
      lastRerouteRef.current = now;
      fetchNavDirections(
        lat,
        lng,
        destRef.current.lat,
        destRef.current.lng,
        travelModeRef.current,
        (freshResult) => applyNavResult(freshResult, 0)
      );
    }

    setState((previous) => ({
      ...previous,
      currentLat: lat,
      currentLng: lng,
      currentStepIndex: nextStepIndex,
      progressDistanceMeters: currentProgressDistance,
      distanceToNext: fmtM(distanceToNextMeters),
      remainingDuration: fmtSec(remainingDurationSeconds),
      remainingDistance: fmtM(remainingDistanceMeters),
      heading: headingRef.current,
      isOffRoute,
    }));
  }, [applyNavResult]);

  const startSimulation = useCallback(
    (
      map: google.maps.Map | null,
      navResult: google.maps.DirectionsResult,
      speedMs: number
    ) => {
      const routePoints = extractRoutePath(navResult.routes[0]);
      const routeSegments = buildRouteSegments(routePoints);

      if (!routeSegments.length || routePoints.length === 0) {
        console.warn('[Nav] Simulation route is empty');
        setState(INITIAL);
        return;
      }

      applyNavResult(navResult, 0);

      const initialHeading = calculateBearing(
        routeSegments[0].startLat,
        routeSegments[0].startLng,
        routeSegments[0].endLat,
        routeSegments[0].endLng
      );

      processPositionUpdate(routePoints[0].lat, routePoints[0].lng, initialHeading, 0);

      if (map) {
        map.setCenter(routePoints[0]);
        map.setZoom(17);
      }

      simulatorRef.current = new GPSSimulator(routeSegments, speedMs);
      lastSimulatorUpdateRef.current = Date.now();
      useNavigationStore.setState({ isSimulationRunning: true });

      simulatorTimerRef.current = window.setInterval(() => {
        const simulator = simulatorRef.current;
        if (!simulator) return;

        const now = Date.now();
        const deltaMs = now - lastSimulatorUpdateRef.current;
        lastSimulatorUpdateRef.current = now;

        const simulatedPosition = simulator.getNextPosition(deltaMs);
        if (!simulatedPosition) {
          finishNavigation();
          return;
        }

        processPositionUpdate(
          simulatedPosition.latitude,
          simulatedPosition.longitude,
          simulatedPosition.heading ?? 0,
          simulator.getDistanceCoveredMeters()
        );

        if (simulator.isComplete()) {
          finishNavigation();
        }
      }, SIMULATION_TICK_MS);
    },
    [applyNavResult, finishNavigation, processPositionUpdate]
  );

  const startNavigation = useCallback(
    (mapRef: React.RefObject<google.maps.Map | null>) => {
      mapRefInternal.current = mapRef.current;

      const {
        endLocation,
        travelMode,
        directionsResult,
        selectedRouteIndex,
        simulationSpeed,
      } = useNavigationStore.getState();

      if (!endLocation) {
        console.warn('[Nav] No destination set');
        return;
      }

      destRef.current = { lat: endLocation.lat, lng: endLocation.lng };

      const googleTravelModes: Partial<Record<string, google.maps.TravelMode>> = {
        DRIVING: window.google.maps.TravelMode.DRIVING,
        WALKING: window.google.maps.TravelMode.WALKING,
        BICYCLING: window.google.maps.TravelMode.BICYCLING,
        TWO_WHEELER: window.google.maps.TravelMode.DRIVING,
      };
      travelModeRef.current =
        googleTravelModes[travelMode] ?? window.google.maps.TravelMode.DRIVING;

      setState((previous) => ({ ...previous, isNavigating: true }));

      const selectedRouteResult = cloneDirectionsWithRoute(
        directionsResult,
        selectedRouteIndex
      );

      if (!selectedRouteResult) {
        console.warn('[Nav] No selected route available for simulation');
        setState(INITIAL);
        return;
      }

      startSimulation(mapRef.current, selectedRouteResult, simulationSpeed ?? 20);
    },
    [applyNavResult, finishNavigation, processPositionUpdate, startSimulation]
  );

  useEffect(() => () => stopNavigation(), [stopNavigation]);

  return { ...state, startNavigation, stopNavigation };
}
