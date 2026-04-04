import { useState, useRef, useCallback } from 'react';

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export type LocationError =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNSUPPORTED'
  | null;

interface UseUserLocationReturn {
  userLocation: UserLocation | null;
  isLocationEnabled: boolean;
  isLocating: boolean;
  locationError: LocationError;
  enableLocation: () => void;
  disableLocation: () => void;
  toggleLocation: () => void;
}

export function useUserLocation(): UseUserLocationReturn {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<LocationError>(null);
  const watchIdRef = useRef<number | null>(null);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const enableLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('UNSUPPORTED');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    // Get an immediate fix first, then start watching
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        setUserLocation({ lat, lng, accuracy });
        setIsLocationEnabled(true);
        setIsLocating(false);

        // Start live tracking
        clearWatch();
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            setUserLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          },
          (err) => {
            // Silent fail during watch — don't destroy the dot
            console.warn('Watch position error:', err.message);
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            setLocationError('PERMISSION_DENIED');
            break;
          case GeolocationPositionError.POSITION_UNAVAILABLE:
            setLocationError('POSITION_UNAVAILABLE');
            break;
          case GeolocationPositionError.TIMEOUT:
            setLocationError('TIMEOUT');
            break;
          default:
            setLocationError('POSITION_UNAVAILABLE');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [clearWatch]);

  const disableLocation = useCallback(() => {
    clearWatch();
    setUserLocation(null);
    setIsLocationEnabled(false);
    setLocationError(null);
  }, [clearWatch]);

  const toggleLocation = useCallback(() => {
    if (isLocationEnabled) {
      disableLocation();
    } else {
      enableLocation();
    }
  }, [isLocationEnabled, enableLocation, disableLocation]);

  return {
    userLocation,
    isLocationEnabled,
    isLocating,
    locationError,
    enableLocation,
    disableLocation,
    toggleLocation,
  };
}
