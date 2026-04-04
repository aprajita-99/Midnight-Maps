import React, { useEffect, useRef } from 'react';
import { useGoogleMap } from '@react-google-maps/api';
import { useNavigationStore } from '../../store/useNavigationStore';

export default function RoutePolylines() {
  const map = useGoogleMap();
  const { 
    directionsResult, 
    selectedRouteIndex, 
    shortestRouteIndex,
    safestRouteIndex,
    balancedRouteIndex
  } = useNavigationStore();

  // 1. Hold strict references to the native Google Maps objects
  const glowLineRef = useRef<google.maps.Polyline | null>(null);
  const borderLineRef = useRef<google.maps.Polyline | null>(null);
  const mainLineRef = useRef<google.maps.Polyline | null>(null);

  // 2. Initialize the polylines exactly ONCE when the map loads
  useEffect(() => {
    if (!map) return;

    // Create the persistent lines directly on the canvas
    glowLineRef.current = new window.google.maps.Polyline({ map, clickable: false });
    borderLineRef.current = new window.google.maps.Polyline({ map, clickable: false });
    mainLineRef.current = new window.google.maps.Polyline({ map, clickable: false });

    // Ensure they are wiped if the component actually unmounts
    return () => {
      glowLineRef.current?.setMap(null);
      borderLineRef.current?.setMap(null);
      mainLineRef.current?.setMap(null);
    };
  }, [map]);

  // 3. Update the coordinates dynamically when you change tabs
  useEffect(() => {
    if (!glowLineRef.current || !borderLineRef.current || !mainLineRef.current) return;

    const currentRoute = directionsResult?.routes?.[selectedRouteIndex];
    
    // If there is no route, clear the paths off the screen immediately
    if (!currentRoute) {
      glowLineRef.current.setPath([]);
      borderLineRef.current.setPath([]);
      mainLineRef.current.setPath([]);
      return;
    }

    const getRouteColor = (index: number) => {
      if (index === safestRouteIndex)   return '#22C55E'; // Green
      if (index === balancedRouteIndex) return '#A855F7'; // Purple
      if (index === shortestRouteIndex) return '#4285F4'; // Blue
      return '#4285F4'; 
    };

    const routeColor = getRouteColor(selectedRouteIndex);
    const path = currentRoute.overview_path;

    // Instantly morph the existing lines to the new route coordinates
    glowLineRef.current.setOptions({
      path: path,
      strokeColor: routeColor,
      strokeOpacity: 0.15,
      strokeWeight: 18,
      zIndex: 100,
    });

    borderLineRef.current.setOptions({
      path: path,
      strokeColor: '#000000',
      strokeOpacity: 0.4,
      strokeWeight: 11,
      zIndex: 105,
    });

    mainLineRef.current.setOptions({
      path: path,
      strokeColor: routeColor,
      strokeOpacity: 1,
      strokeWeight: 7,
      zIndex: 110,
    });

  }, [directionsResult, selectedRouteIndex, safestRouteIndex, balancedRouteIndex, shortestRouteIndex]);

  // Return null because we are injecting straight into the Google Canvas, bypassing the React DOM
  return null; 
}
