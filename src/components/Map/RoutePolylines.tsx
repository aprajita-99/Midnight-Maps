import { useEffect, useRef, useCallback } from 'react';
import { useNavigationStore } from '../../store/useNavigationStore';
import { extractRoutePath, splitRoutePath, splitRoutePathByDistance } from '../../utils/routePath';
import type { RoutePoint } from '../../utils/routePath';

interface RoutePolylinesProps {
  mapRef: React.RefObject<google.maps.Map | null>;
  isNavigating?: boolean;
  navDirectionsResult?: google.maps.DirectionsResult | null;
  currentPosition?: { lat: number; lng: number } | null;
  progressDistanceMeters?: number | null;
}

function getRouteColor(
  index: number,
  shortestRouteIndex: number | null,
  safestRouteIndex: number | null,
  balancedRouteIndex: number | null
) {
  if (index === safestRouteIndex) return '#22C55E';
  if (index === balancedRouteIndex) return '#A855F7';
  if (index === shortestRouteIndex) return '#4285F4';
  return '#38BDF8';
}

function createPolyline(
  map: google.maps.Map,
  path: RoutePoint[],
  color: string,
  opacity: number,
  weight: number,
  zIndex: number
): google.maps.Polyline {
  return new window.google.maps.Polyline({
    path,
    map,
    clickable: false,
    strokeColor: color,
    strokeOpacity: opacity,
    strokeWeight: weight,
    zIndex,
  });
}

export default function RoutePolylines({
  mapRef,
  isNavigating = false,
  navDirectionsResult = null,
  currentPosition = null,
  progressDistanceMeters = null,
}: RoutePolylinesProps) {
  const {
    directionsResult,
    selectedRouteIndex,
    shortestRouteIndex,
    safestRouteIndex,
    balancedRouteIndex,
  } = useNavigationStore();

  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const clearAll = useCallback(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Always clear previous native polylines before drawing new ones
    clearAll();

    // ── Navigation (active simulation) mode ────────────────────────────────
    if (isNavigating && navDirectionsResult?.routes[0]) {
      const routeColor = getRouteColor(
        selectedRouteIndex,
        shortestRouteIndex,
        safestRouteIndex,
        balancedRouteIndex
      );
      const fullPath = extractRoutePath(navDirectionsResult.routes[0]);
      const { traveled, remaining } =
        progressDistanceMeters != null
          ? splitRoutePathByDistance(fullPath, progressDistanceMeters)
          : splitRoutePath(fullPath, currentPosition);

      if (traveled.length > 1) {
        polylinesRef.current.push(createPolyline(map, traveled, '#6B7280', 0.9, 6, 108));
      }
      if (remaining.length > 1) {
        polylinesRef.current.push(createPolyline(map, remaining, routeColor, 1, 6, 109));
      }
      return clearAll;
    }

    // ── Preview / route-selection mode ─────────────────────────────────────
    if (!directionsResult?.routes?.length) return clearAll;

    const routeCount = directionsResult.routes.length;
    const activeRouteIndex = Math.min(selectedRouteIndex, Math.max(routeCount - 1, 0));
    const activeRoute = directionsResult.routes[activeRouteIndex];

    if (!activeRoute) return clearAll;

    const path = extractRoutePath(activeRoute);
    if (path.length < 2) return clearAll;

    const routeColor = getRouteColor(
      activeRouteIndex,
      shortestRouteIndex,
      safestRouteIndex,
      balancedRouteIndex
    );

    polylinesRef.current.push(createPolyline(map, path, routeColor, 1, 6, 98));

    return clearAll;
  }, [
    mapRef,
    clearAll,
    isNavigating,
    navDirectionsResult,
    progressDistanceMeters,
    currentPosition,
    directionsResult,
    selectedRouteIndex,
    shortestRouteIndex,
    safestRouteIndex,
    balancedRouteIndex,
  ]);

  return null;
}
