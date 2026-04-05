import { Polyline } from '@react-google-maps/api';
import { useNavigationStore } from '../../store/useNavigationStore';
import { extractRoutePath, splitRoutePath, splitRoutePathByDistance } from '../../utils/routePath';

interface RoutePolylinesProps {
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

export default function RoutePolylines({
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

    return (
      <>
        {traveled.length > 1 && (
          <Polyline
            path={traveled}
            options={{
              clickable: false,
              strokeColor: '#6B7280',
              strokeOpacity: 0.9,
              strokeWeight: 6,
              zIndex: 108,
            }}
          />
        )}
        {remaining.length > 1 && (
          <Polyline
            path={remaining}
            options={{
              clickable: false,
              strokeColor: routeColor,
              strokeOpacity: 1,
              strokeWeight: 6,
              zIndex: 109,
            }}
          />
        )}
      </>
    );
  }

  if (!directionsResult?.routes?.length) {
    return null;
  }

  const routeCount = directionsResult.routes.length;
  const activeRouteIndex = Math.min(selectedRouteIndex, Math.max(routeCount - 1, 0));
  const activeRoute = directionsResult.routes[activeRouteIndex];

  if (!activeRoute) {
    return null;
  }

  const path = extractRoutePath(activeRoute);
  const routeColor = getRouteColor(
    activeRouteIndex,
    shortestRouteIndex,
    safestRouteIndex,
    balancedRouteIndex
  );

  if (path.length < 2) {
    return null;
  }

  return (
    <>
      <Polyline
        path={path}
        options={{
          clickable: false,
          strokeColor: routeColor,
          strokeOpacity: 1,
          strokeWeight: 6,
          zIndex: 98,
        }}
      />
    </>
  );
}
