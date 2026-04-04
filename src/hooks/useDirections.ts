import { useCallback } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND:              'One or more locations could not be found. Try searching again.',
  ZERO_RESULTS:           'No route found between these locations for the selected travel mode.',
  MAX_WAYPOINTS_EXCEEDED: 'Too many waypoints in the request.',
  INVALID_REQUEST:        'Invalid route request. Please reselect your locations.',
  REQUEST_DENIED:         'Directions API is not enabled or the API key is restricted.',
  OVER_DAILY_LIMIT:       'API quota exceeded. Please try again tomorrow.',
  OVER_QUERY_LIMIT:       'Too many requests. Please wait a moment and try again.',
  UNKNOWN_ERROR:          'A temporary server error occurred. Retrying…',
};

function isValidCoord(lat: number, lng: number): boolean {
  return (
    isFinite(lat) && isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

export function useDirections() {
  const setDirectionsResult = useNavigationStore(state => state.setDirectionsResult);
  const setIsLoading        = useNavigationStore(state => state.setIsLoading);
  const setError            = useNavigationStore(state => state.setError);

  const doRoute = useCallback((retry = false) => {
    const { startLocation, endLocation, travelMode } = useNavigationStore.getState();

    if (!startLocation || !endLocation) {
      setError('Please select both a start location and destination.');
      return;
    }

    if (!isValidCoord(startLocation.lat, startLocation.lng)) {
      setError('Start location coordinates are invalid. Please reselect.');
      return;
    }
    if (!isValidCoord(endLocation.lat, endLocation.lng)) {
      setError('Destination coordinates are invalid. Please reselect.');
      return;
    }

    if (!window.google?.maps?.DirectionsService) {
      setError('Google Maps is not fully loaded yet. Please wait.');
      return;
    }

    if (!retry) {
      setIsLoading(true);
      setError(null);
    }

    const directionsService = new window.google.maps.DirectionsService();

    const googleModeMap: Record<string, google.maps.TravelMode> = {
      DRIVING:     window.google.maps.TravelMode.DRIVING,
      TWO_WHEELER: (window.google.maps.TravelMode as any).TWO_WHEELER
                   ?? window.google.maps.TravelMode.DRIVING,
      WALKING:     window.google.maps.TravelMode.WALKING,
      BICYCLING:   window.google.maps.TravelMode.BICYCLING,
    };

    const googleTravelMode = googleModeMap[travelMode] ?? window.google.maps.TravelMode.DRIVING;

    directionsService.route(
      {
        origin:      new window.google.maps.LatLng(startLocation.lat, startLocation.lng),
        destination: new window.google.maps.LatLng(endLocation.lat,   endLocation.lng),
        travelMode:  googleTravelMode,
        provideRouteAlternatives: true,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirectionsResult(result);
          
          // Trigger Route Analysis
          const routesToAnalyze = result.routes.map((route) => ({
            points: route.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() })),
            distance: route.legs[0].distance?.value || 0,
            duration: route.legs[0].duration?.value || 0,
          }));

          fetch('/api/segments/analyze-routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ routes: routesToAnalyze }),
          })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                useNavigationStore.getState().setRouteAnalysis(data);
              }
            })
            .catch(err => console.error('Route analysis failed:', err))
            .finally(() => setIsLoading(false));

          return;
        }

        if (status === window.google.maps.DirectionsStatus.UNKNOWN_ERROR && !retry) {
          // Auto-retry once after a short pause for transient server errors
          setTimeout(() => doRoute(true), 300);
          return;
        }

        setIsLoading(false);
        const friendly = ERROR_MESSAGES[status] ?? `Route request failed (${status}).`;
        setError(friendly);
      }
    );
  }, [setDirectionsResult, setIsLoading, setError]);

  const fetchDirections = useCallback(() => doRoute(false), [doRoute]);

  return { fetchDirections };
}
