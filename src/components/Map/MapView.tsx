import { GoogleMap, Marker, Circle, OverlayView } from '@react-google-maps/api';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, MapPin, X, Copy, Check, Shield, Store as StoreIcon } from 'lucide-react';
import clsx from 'clsx';
import RoutePolylines from './RoutePolylines.tsx';
import { useNavigationStore } from '../../store/useNavigationStore.ts';
import { useDirections } from '../../hooks/useDirections.ts';
import type { UserLocation } from '../../hooks/useUserLocation.ts';
import type { NavState } from '../../hooks/useNavigationController.ts';
import SafetyInspector from './SafetyInspector';

import cameraData from '../../../datasets/koramangala_cameras.json';
import lampData from '../../../datasets/koramangala_street_lamps.json';

interface MapViewProps {
  userLocation?: UserLocation | null;
  isLocationEnabled?: boolean;
  mapRef?: React.MutableRefObject<google.maps.Map | null>;
  navState?: Pick<NavState, 'isNavigating' | 'currentLat' | 'currentLng' | 'currentStepIndex' | 'steps' | 'heading' | 'navDirectionsResult' | 'progressDistanceMeters'>;
  safetyInspectorActive?: boolean;
}

const containerStyle = { width: '100%', height: '100%' };
const center = {
  lat: 12.9352,
  lng: 77.6245
};
const CAMERA_LOOKAHEAD_METERS = 35;
const CAMERA_LEFT_OFFSET_PX = 100;
const POSITION_SMOOTHING = 0.3;     // Snappier but still fluid
const HEADING_SMOOTHING = 0.22;    // Tighter rotation smoothing
const NEARBY_ALERT_RADIUS_METERS = 200;
const NEARBY_ALERT_REFRESH_METERS = 80;
const NEARBY_ALERT_REFRESH_MS = 6000;

interface SmoothedNavPosition {
  lat: number;
  lng: number;
  heading: number;
}

type NearbyAlertKind = 'police' | 'shop';

interface NearbyAlertPlace {
  id: string;
  kind: NearbyAlertKind;
  name: string;
  position: google.maps.LatLngLiteral;
  distanceMeters: number;
  vicinity?: string;
}

function normalizeHeading(heading: number) {
  return ((heading % 360) + 360) % 360;
}

function smoothHeadingTransition(current: number, target: number, factor: number) {
  const delta = ((target - current + 540) % 360) - 180;
  return normalizeHeading(current + delta * factor);
}

function lerp(start: number, end: number, factor: number) {
  return start + (end - start) * factor;
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

function moveCoordinate(
  lat: number,
  lng: number,
  bearing: number,
  distanceM: number
) {
  const earthRadiusM = 6_371_000;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lng * Math.PI) / 180;
  const theta = (bearing * Math.PI) / 180;
  const delta = distanceM / earthRadiusM;

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) +
      Math.cos(phi1) * Math.sin(delta) * Math.cos(theta)
  );

  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2)
    );

  return {
    lat: phi2 * (180 / Math.PI),
    lng: lambda2 * (180 / Math.PI),
  };
}

function rotatePixelOffset(offsetX: number, offsetY: number, rotationDeg: number) {
  const rad = (rotationDeg * Math.PI) / 180;
  return {
    x: offsetX * Math.cos(rad) - offsetY * Math.sin(rad),
    y: offsetX * Math.sin(rad) + offsetY * Math.cos(rad),
  };
}

function supportsVectorCamera(map: google.maps.Map) {
  const renderingTypeGetter = (
    map as google.maps.Map & {
      getRenderingType?: () => google.maps.RenderingType | string;
    }
  ).getRenderingType;
  const renderingType = renderingTypeGetter?.call(map);
  const vectorRenderingType = window.google?.maps?.RenderingType?.VECTOR;

  return Boolean(vectorRenderingType && renderingType === vectorRenderingType);
}

function offsetLatLngByPixels(
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  offsetX: number,
  offsetY: number,
  rotationDeg = 0
) {
  const projection = map.getProjection();
  const zoom = map.getZoom();
  if (!projection || zoom == null) {
    return position;
  }

  const worldPoint = projection.fromLatLngToPoint(new window.google.maps.LatLng(position));
  if (!worldPoint) {
    return position;
  }

  const scale = 2 ** zoom;
  const rotatedOffset = rotatePixelOffset(offsetX, offsetY, rotationDeg);
  const shiftedPoint = new window.google.maps.Point(
    worldPoint.x + rotatedOffset.x / scale,
    worldPoint.y + rotatedOffset.y / scale
  );
  const shiftedLatLng = projection.fromPointToLatLng(shiftedPoint);
  if (!shiftedLatLng) {
    return position;
  }

  return {
    lat: shiftedLatLng.lat(),
    lng: shiftedLatLng.lng(),
  };
}

function NearbyAlertMarker({ alert }: { alert: NearbyAlertPlace }) {
  const isPolice = alert.kind === 'police';
  const Icon = isPolice ? Shield : StoreIcon;
  const label = isPolice ? 'Police' : 'Open Shop';

  return (
    <OverlayView
      position={alert.position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div
        title={`${alert.name} • ${Math.round(alert.distanceMeters)} m`}
        className="relative -translate-x-1/2 -translate-y-[calc(100%+6px)] pointer-events-none"
      >
        {/* Pulsing beacon behind icon — slightly smaller */}
        <motion.div
          animate={{
            scale: [1, 2, 1],
            opacity: [0.35, 0, 0.35],
          }}
          transition={{
            duration: 2.0,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={clsx(
            "absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full",
            isPolice ? "bg-red-500/30" : "bg-primary-green/30"
          )}
        />
        
        {/* The Badge — more compact padding and text */}
        <div className={clsx(
          "relative flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-xl backdrop-blur-md transition-all duration-300",
          isPolice 
            ? "bg-red-600/85 border-red-300/40 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
            : "bg-emerald-600/85 border-emerald-300/40 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        )}>
          <Icon size={11} strokeWidth={3} className="text-white shrink-0" />
          <span className="text-[9px] font-black uppercase tracking-wide whitespace-nowrap leading-none">
            {label}
          </span>
        </div>
      </div>
    </OverlayView>
  );
}

function isNearbyAlertPlace(place: NearbyAlertPlace | null): place is NearbyAlertPlace {
  return place !== null;
}

export default function MapView({ userLocation, isLocationEnabled, mapRef: externalMapRef, navState, safetyInspectorActive = false }: MapViewProps) {
  const store = useNavigationStore();
  
  // Grab the toggle states from our Zustand store
  const { showCameras, showLamps, showPolice, showNearbyAlerts } = store;

  const [, setMap] = useState<google.maps.Map | null>(null);
  const internalMapRef = useRef<google.maps.Map | null>(null);
  const nearbyPlacesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const nearbyQueryMetaRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const nearbyRequestIdRef = useRef(0);
  const storeRef = useRef(store);
  storeRef.current = store;

  // ── Tooltip state ────────────────────────────────────────────────────────
  const [coordsTooltip, setCoordsTooltip] = useState<{ lat: number, lng: number } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyCoords = useCallback((coords: { lat: number, lng: number }) => {
    const text = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, []);

  // ── Navigation camera state ──────────────────────────────────────────────
  const [isFollowing, setIsFollowing] = useState(true);
  const isFollowingRef = useRef(true);   // readable inside callbacks without stale closure
  const lastHeadingRef = useRef(0);
  const lastCameraUpdateRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const targetNavPositionRef = useRef<SmoothedNavPosition | null>(null);
  const smoothedNavPositionRef = useRef<SmoothedNavPosition | null>(null);
  const [smoothedNavPosition, setSmoothedNavPosition] = useState<SmoothedNavPosition | null>(null);
  const [nearbyAlerts, setNearbyAlerts] = useState<NearbyAlertPlace[]>([]);

  const updateFollowCamera = useCallback((
    map: google.maps.Map,
    lat: number,
    lng: number,
    heading: number,
    zoom = 18
  ) => {
    const isVectorMap = supportsVectorCamera(map);
    const aheadPoint = moveCoordinate(lat, lng, heading, CAMERA_LOOKAHEAD_METERS);
    const cameraCenter = offsetLatLngByPixels(
      map,
      aheadPoint,
      CAMERA_LEFT_OFFSET_PX,
      0,
      isVectorMap ? heading : 0
    );

    const vectorMap = map as google.maps.Map & {
      moveCamera?: (cameraOptions: {
        center: google.maps.LatLngLiteral;
        heading: number;
        tilt: number;
        zoom: number;
      }) => void;
    };

    if (isVectorMap && typeof vectorMap.moveCamera === 'function') {
      vectorMap.moveCamera({
        center: cameraCenter,
        heading,
        tilt: 60,
        zoom,
      });
      return;
    }

    map.setCenter(cameraCenter);
    map.setZoom(zoom);
  }, []);

  const searchNearbyPlaces = useCallback((
    request: google.maps.places.PlaceSearchRequest
  ) => {
    const service = nearbyPlacesServiceRef.current;
    if (!service) {
      return Promise.resolve([] as google.maps.places.PlaceResult[]);
    }

    return new Promise<google.maps.places.PlaceResult[]>((resolve) => {
      service.nearbySearch(request, (results, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK ||
          status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
        ) {
          resolve(results ?? []);
          return;
        }

        console.warn('[Nearby Alerts] Places search failed:', status, request);
        resolve([]);
      });
    });
  }, []);

  const mapPlaceToAlert = useCallback((
    place: google.maps.places.PlaceResult,
    kind: NearbyAlertKind,
    origin: google.maps.LatLngLiteral
  ): NearbyAlertPlace | null => {
    const location = place.geometry?.location;
    if (!location) {
      return null;
    }

    const lat = location.lat();
    const lng = location.lng();

    return {
      id: place.place_id ?? `${kind}-${lat}-${lng}`,
      kind,
      name: place.name ?? (kind === 'police' ? 'Police Station' : 'Open Shop'),
      position: { lat, lng },
      distanceMeters: haversineM(origin.lat, origin.lng, lat, lng),
      vicinity: place.vicinity,
    };
  }, []);

  // Keep ref in sync with state
  useEffect(() => { isFollowingRef.current = isFollowing; }, [isFollowing]);

  // Reset follow mode whenever navigation starts / stops
  useEffect(() => {
    if (navState?.isNavigating) {
      const map = internalMapRef.current;
      if (map) {
        map.setZoom(18);
        if (supportsVectorCamera(map)) {
          map.setTilt(60);
        }
      }
      lastHeadingRef.current = normalizeHeading(navState.heading ?? 0);
      targetNavPositionRef.current = null;
      smoothedNavPositionRef.current = null;
      setSmoothedNavPosition(null);
      setIsFollowing(true);
    } else {
      // Exit nav: restore flat map
      const map = internalMapRef.current;
      if (map && supportsVectorCamera(map)) {
        map.setHeading(0);
        map.setTilt(0);
      }
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      targetNavPositionRef.current = null;
      smoothedNavPositionRef.current = null;
      setSmoothedNavPosition(null);
      lastHeadingRef.current = 0;
    }
  }, [navState?.heading, navState?.isNavigating]);

  // ── Camera follow + rotation on every GPS update ─────────────────────────
 useEffect(() => {
  return;
  if (navState?.currentLat === null || navState?.currentLng === null) return;

  const map = internalMapRef.current;
  if (!map) return;

  const lat = navState?.currentLat ?? 0;
  const lng = navState?.currentLng ?? 0;
  const heading = navState?.heading ?? 0;

  // ── Smooth heading ─────────────────────────────
  const smoothHeading = smoothHeadingTransition(lastHeadingRef.current, heading, 0.3);

  lastHeadingRef.current = smoothHeading;

  if (!isFollowingRef.current) return;
  const now = Date.now();
  if (now - lastCameraUpdateRef.current < 75) return;

  lastCameraUpdateRef.current = now;
  updateFollowCamera(map as google.maps.Map, lat, lng, smoothHeading);

}, [
  navState?.currentLat,
  navState?.currentLng,
  navState?.heading,
  navState?.isNavigating,
  updateFollowCamera
]);

  useEffect(() => {
    if (!navState?.isNavigating || navState.currentLat == null || navState.currentLng == null) {
      targetNavPositionRef.current = null;
      smoothedNavPositionRef.current = null;
      setSmoothedNavPosition(null);
      return;
    }

    const nextTarget = {
      lat: navState.currentLat,
      lng: navState.currentLng,
      heading: normalizeHeading(navState.heading ?? lastHeadingRef.current),
    };

    targetNavPositionRef.current = nextTarget;

    if (!smoothedNavPositionRef.current) {
      smoothedNavPositionRef.current = nextTarget;
      lastHeadingRef.current = nextTarget.heading;
      setSmoothedNavPosition(nextTarget);
    }
  }, [navState?.currentLat, navState?.currentLng, navState?.heading, navState?.isNavigating]);

  useEffect(() => {
    if (!navState?.isNavigating) {
      return;
    }

    const animate = () => {
      const current = smoothedNavPositionRef.current;
      const target = targetNavPositionRef.current;

      if (current && target) {
        const next = {
          lat: lerp(current.lat, target.lat, POSITION_SMOOTHING),
          lng: lerp(current.lng, target.lng, POSITION_SMOOTHING),
          heading: smoothHeadingTransition(current.heading, target.heading, HEADING_SMOOTHING),
        };

        if (Math.abs(next.lat - target.lat) < 0.000001) {
          next.lat = target.lat;
        }
        if (Math.abs(next.lng - target.lng) < 0.000001) {
          next.lng = target.lng;
        }

        const headingDelta = Math.abs(((target.heading - next.heading + 540) % 360) - 180);
        if (headingDelta < 0.5) {
          next.heading = target.heading;
        }

        smoothedNavPositionRef.current = next;
        lastHeadingRef.current = next.heading;
        setSmoothedNavPosition(next);

        const map = internalMapRef.current;
        if (map && isFollowingRef.current) {
          updateFollowCamera(map, next.lat, next.lng, next.heading);
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [navState?.isNavigating, updateFollowCamera]);
  // ── Recenter handler ──────────────────────────────────────────────────────
  const handleRecenter = useCallback(() => {
    const map = internalMapRef.current;
    if (!map) return;

    const currentPosition = smoothedNavPositionRef.current ?? (
      navState?.currentLat != null && navState?.currentLng != null
        ? {
            lat: navState.currentLat,
            lng: navState.currentLng,
            heading: normalizeHeading(navState?.heading ?? 0),
          }
        : null
    );
    if (!currentPosition) return;

    setIsFollowing(true);
    lastHeadingRef.current = currentPosition.heading;
    updateFollowCamera(
      map,
      currentPosition.lat,
      currentPosition.lng,
      currentPosition.heading
    );
  }, [navState?.currentLat, navState?.currentLng, navState?.heading, updateFollowCamera]);

  // ── Map lifecycle ─────────────────────────────────────────────────────────
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    internalMapRef.current = map;
    if (window.google.maps.places) {
      nearbyPlacesServiceRef.current = new window.google.maps.places.PlacesService(map);
    }
    if (externalMapRef) externalMapRef.current = map;
  }, [externalMapRef]);

  const onUnmount = useCallback(() => {
    setMap(null);
    internalMapRef.current = null;
    nearbyPlacesServiceRef.current = null;
    if (externalMapRef) externalMapRef.current = null;
  }, [externalMapRef]);

  // ── Traffic layer toggle ──────────────────────────────────────────────────
  useEffect(() => {
    const map = internalMapRef.current;
    if (!map) return;

    const trafficLayer = new window.google.maps.TrafficLayer();
    if (store.showTraffic) {
      trafficLayer.setMap(map);
    } else {
      trafficLayer.setMap(null);
    }

    // Cleanup: remove traffic layer on unmount
    return () => {
      trafficLayer.setMap(null);
    };
  }, [store.showTraffic]);

  // ── Directions / marker drag ──────────────────────────────────────────────
  useEffect(() => {
    const isNavActive = !!navState?.isNavigating;
    const currentLat = isNavActive ? navState?.currentLat : userLocation?.lat;
    const currentLng = isNavActive ? navState?.currentLng : userLocation?.lng;

    if (!showNearbyAlerts || currentLat == null || currentLng == null) {
      nearbyRequestIdRef.current += 1;
      nearbyQueryMetaRef.current = null;
      setNearbyAlerts([]);
      return;
    }

    if (!nearbyPlacesServiceRef.current || !window.google.maps.places) {
      return;
    }

    const origin = { lat: currentLat, lng: currentLng };
    const now = Date.now();
    const previousQuery = nearbyQueryMetaRef.current;

    if (
      previousQuery &&
      haversineM(previousQuery.lat, previousQuery.lng, origin.lat, origin.lng) < NEARBY_ALERT_REFRESH_METERS &&
      now - previousQuery.timestamp < NEARBY_ALERT_REFRESH_MS
    ) {
      return;
    }

    nearbyQueryMetaRef.current = {
      lat: origin.lat,
      lng: origin.lng,
      timestamp: now,
    };

    const requestId = nearbyRequestIdRef.current + 1;
    nearbyRequestIdRef.current = requestId;
    const rankByDistance = window.google.maps.places.RankBy.DISTANCE;

    Promise.all([
      searchNearbyPlaces({
        location: origin,
        rankBy: rankByDistance,
        type: 'police',
      }),
      searchNearbyPlaces({
        location: origin,
        radius: NEARBY_ALERT_RADIUS_METERS,
        type: 'store',
        openNow: true,
      }),
    ]).then(([policePlaces, shopPlaces]) => {
      if (nearbyRequestIdRef.current !== requestId) {
        return;
      }

      const policeAlerts = policePlaces
        .map((place) => mapPlaceToAlert(place, 'police', origin))
        .filter(isNearbyAlertPlace)
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, 3);

      const shopAlerts = shopPlaces
        .map((place) => mapPlaceToAlert(place, 'shop', origin))
        .filter(isNearbyAlertPlace)
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, 5);

      const dedupedAlerts = [...policeAlerts, ...shopAlerts].filter((alert, index, alerts) =>
        alerts.findIndex((candidate) => candidate.id === alert.id) === index
      );

      setNearbyAlerts(dedupedAlerts);
    });
  }, [
    mapPlaceToAlert,
    showNearbyAlerts,
    userLocation?.lat,
    userLocation?.lng,
    isLocationEnabled,
  ]);

  const { fetchDirections } = useDirections();

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent, type: 'start' | 'end') => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const latestStore = useNavigationStore.getState();
    const tempAddress = 'Updating location...';
    if (type === 'start') latestStore.setStartLocation({ address: tempAddress, lat, lng });
    else latestStore.setEndLocation({ address: tempAddress, lat, lng });
    setTimeout(() => fetchDirections(), 50);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      const store = useNavigationStore.getState();
      const address = (status === 'OK' && results?.[0])
        ? results[0].formatted_address
        : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      if (type === 'start') store.setStartLocation({ address, lat, lng });
      else store.setEndLocation({ address, lat, lng });
    });
  }, [fetchDirections]);

  const { mapType, startLocation, endLocation } = store;
  const isNav = !!navState?.isNavigating;

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng || isNav) return;
    setCoordsTooltip(null); // Dismiss tooltip on single click
  }, [isNav]);

  const handleMapDblClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    setCoordsTooltip({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        onLoad={onLoad}
        onUnmount={onUnmount}
        mapTypeId={mapType}
        onClick={handleMapClick}
        onDblClick={handleMapDblClick}
        /* Detect user panning map — breaks camera follow */
        onDragStart={() => { if (isNav) setIsFollowing(false); setCoordsTooltip(null); }}
        options={{
          disableDefaultUI: true,
          zoomControl: false,
          clickableIcons: false,
          disableDoubleClickZoom: true, // Disable zoom to focus on tooltip
          rotateControl: false,    // we manage rotation ourselves
        }}
      >
        {!isNav && <RoutePolylines />}
        {isNav && (
          <RoutePolylines
            isNavigating={true}
            navDirectionsResult={navState?.navDirectionsResult ?? null}
            progressDistanceMeters={navState?.progressDistanceMeters ?? null}
            currentPosition={
              smoothedNavPosition
                ? { lat: smoothedNavPosition.lat, lng: smoothedNavPosition.lng }
                : navState?.currentLat != null && navState?.currentLng != null
                  ? { lat: navState.currentLat, lng: navState.currentLng }
                  : null
            }
          />
        )}

        {/* --- DATABASES & OVERLAYS --- */}
        
        {/* 1. Street Lamps Layer (Yellow Dots) */}
        {showLamps && lampData.map((lamp: any, i: number) => (
          <Marker
            key={`lamp-${i}`}
            position={{ lat: lamp.lat, lng: lamp.lng }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 4,
              fillColor: '#EAB308', 
              fillOpacity: 0.8,
              strokeWeight: 0,
            }}
            zIndex={20}
          />
        ))}

        {/* 2. CCTV Cameras Layer (Blue Camera Icons) */}
        {showCameras && cameraData.map((cam: any, i: number) => (
          <Marker
            key={`cam-${i}`}
            position={{ lat: cam.lat, lng: cam.lng }}
            icon={{
              url: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%233B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
              scaledSize: new window.google.maps.Size(20, 20),
            }}
            zIndex={21}
          />
        ))}

        {/* 3. Police Stations Layer (Red Shield Icons for Hackathon Demo) */}
        {showPolice && [
          { lat: 12.9348, lng: 77.6140, name: "Koramangala Police Station" },
          { lat: 12.9228, lng: 77.6250, name: "Madiwala Police Station" },
          { lat: 12.9150, lng: 77.6400, name: "HSR Layout Police Station" }
        ].map((police, i) => (
          <Marker
            key={`police-${i}`}
            position={{ lat: police.lat, lng: police.lng }}
            title={police.name}
            icon={{
              url: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="%23EF4444" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
              scaledSize: new window.google.maps.Size(26, 26),
            }}
            zIndex={22}
          />
        ))}

        {showNearbyAlerts && nearbyAlerts.map((alert) => (
          <NearbyAlertMarker key={alert.id} alert={alert} />
        ))}

        {/* Coords Tooltip */}
        <AnimatePresence>
          {coordsTooltip && (
            <OverlayView
              position={coordsTooltip}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 10 }}
                className="relative -translate-x-1/2 -translate-y-[120%] z-[9999]"
              >
                <div className="bg-dark-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-primary-green">
                      <MapPin size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Captured Coords</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleCopyCoords(coordsTooltip)}
                        className={clsx(
                          "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200 border",
                          isCopied 
                            ? "bg-primary-green/20 text-primary-green border-primary-green/30" 
                            : "text-gray-400 hover:text-white hover:bg-white/5 border-transparent"
                        )}
                        title="Copy coordinates"
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        <span className="text-[9px] font-bold uppercase tracking-tight">
                          {isCopied ? 'Copied!' : 'Copy'}
                        </span>
                      </button>
                      <button 
                        onClick={() => setCoordsTooltip(null)}
                        title="Close coordinates tooltip"
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium uppercase text-[9px]">Latitude</span>
                      <span className="text-white font-mono font-bold">{coordsTooltip.lat.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium uppercase text-[9px]">Longitude</span>
                      <span className="text-white font-mono font-bold">{coordsTooltip.lng.toFixed(6)}</span>
                    </div>
                  </div>
                  {/* Arrow pin */}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-dark-900/90 rotate-45 border-r border-b border-white/10" />
                </div>
              </motion.div>
            </OverlayView>
          )}
        </AnimatePresence>

        {/* Blue dot — only when NOT navigating */}
        {(!isNav && isLocationEnabled && userLocation) ? (
          <React.Fragment key="user-location-group">
            <Circle
              key="user-accuracy-circle"
              center={{ lat: userLocation.lat, lng: userLocation.lng }}
              radius={userLocation.accuracy ?? 30}
              options={{ fillColor: '#4285F4', fillOpacity: 0.15, strokeOpacity: 0, clickable: false }}
            />
            <Marker
              key="user-location-marker"
              position={{ lat: userLocation.lat, lng: userLocation.lng }}
              zIndex={20}
              clickable={false}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2.5,
              }}
            />
          </React.Fragment>
        ) : null}

        {/* A / B drag markers — hidden during navigation */}
        {!isNav && startLocation && (
          <Marker
            position={{ lat: startLocation.lat, lng: startLocation.lng }}
            label={{ text: 'A', color: 'white', fontWeight: 'bold', fontSize: '13px' }}
            zIndex={10}
            draggable={true}
            onDragEnd={(e) => handleMarkerDragEnd(e, 'start')}
          />
        )}
        {!isNav && endLocation && (
          <Marker
            position={{ lat: endLocation.lat, lng: endLocation.lng }}
            label={{ text: 'B', color: 'white', fontWeight: 'bold', fontSize: '13px' }}
            zIndex={10}
            draggable={true}
            onDragEnd={(e) => handleMarkerDragEnd(e, 'end')}
          />
        )}

        {/* Working Zone Boundary: 3km radius around Koramangala center */}
        <Circle
          center={center}
          radius={3000}
          options={{
            fillColor: '#92aedbff',
            fillOpacity: 0.03,
            strokeColor: '#40011bff',
            strokeOpacity: 0.6,
            strokeWeight: 2,
            clickable: false,
            zIndex: 1
          }}
        />

        {/* Safety Inspector — only mounts when NOT navigating */}
        {!isNav && (
          <SafetyInspector
            isActive={safetyInspectorActive}
          />
        )}

        {/* Navigation arrow at user's GPS position */}
        {isNav && (smoothedNavPosition || (navState.currentLat !== null && navState.currentLng !== null)) && (
          <Marker
            position={
              smoothedNavPosition
                ? { lat: smoothedNavPosition.lat, lng: smoothedNavPosition.lng }
                : { lat: navState.currentLat!, lng: navState.currentLng! }
            }
            zIndex={40}
            clickable={false}
            icon={{
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              rotation: lastHeadingRef.current,
              anchor: new window.google.maps.Point(0, 2.5),
            }}
          />
        )}
      </GoogleMap>

      {/* Recenter button — appears when user drags map away during navigation */}
      {isNav && createPortal(
        <AnimatePresence>
          {!isFollowing && (
            <motion.button
              key="recenter"
              initial={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
              transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
              onClick={handleRecenter}
              className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[8500] flex items-center gap-2 px-5 py-3 rounded-full bg-blue-600 border border-blue-400 shadow-[0_8px_30px_rgb(0,0,0,0.5)] text-white text-sm font-bold hover:bg-blue-500 active:scale-95 transition-all duration-150"
            >
              <Crosshair size={18} className="text-white" />
              Recenter
            </motion.button>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
