import React from 'react';
import { Polyline } from '@react-google-maps/api';
import { useNavigationStore } from '../../store/useNavigationStore';

export default function RoutePolylines() {
  const { 
    directionsResult, 
    selectedRouteIndex, 
    shortestRouteIndex,
    safestRouteIndex,
    balancedRouteIndex
  } = useNavigationStore();

  if (!directionsResult || directionsResult.routes.length === 0) return null;

  const currentRoute = directionsResult.routes[selectedRouteIndex];
  if (!currentRoute) return null;

  const getRouteColor = (index: number) => {
    // Priority: Safest > Balanced > Shortest
    if (index === safestRouteIndex)   return '#22C55E'; // Green
    if (index === balancedRouteIndex) return '#A855F7'; // Purple
    if (index === shortestRouteIndex) return '#4285F4'; // Blue
    return '#4285F4'; // Default to Blue
  };

  const routeColor = getRouteColor(selectedRouteIndex);

  return (
    <>
      <React.Fragment key={`selected-route-${selectedRouteIndex}`}>
        {/* Glow layer for better visibility on dark map */}
        <Polyline
          path={currentRoute.overview_path}
          options={{
            strokeColor: routeColor,
            strokeOpacity: 0.15,
            strokeWeight: 18,
            zIndex: 100,
            clickable: false
          }}
        />
        {/* Border / Outer stroke */}
        <Polyline
          path={currentRoute.overview_path}
          options={{
            strokeColor: '#000000',
            strokeOpacity: 0.4,
            strokeWeight: 11,
            zIndex: 105,
            clickable: false
          }}
        />
        {/* Main Line */}
        <Polyline
          path={currentRoute.overview_path}
          options={{
            strokeColor: routeColor,
            strokeOpacity: 1,
            strokeWeight: 7,
            zIndex: 110,
          }}
        />
      </React.Fragment>
    </>
  );
}
