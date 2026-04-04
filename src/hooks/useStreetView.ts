import { useState, useRef, useCallback } from 'react';

export interface StreetViewLocation {
  lat: number;
  lng: number;
}

type SVStatus = 'idle' | 'loading' | 'open' | 'unavailable' | 'error';

export interface UseStreetViewReturn {
  svStatus: SVStatus;
  svLocation: StreetViewLocation | null;
  panoramaRef: React.RefObject<google.maps.StreetViewPanorama | null>;
  openStreetView: (lat: number, lng: number) => void;
  closeStreetView: (mapInstance: google.maps.Map | null) => void;
}

export function useStreetView(): UseStreetViewReturn {
  const [svStatus, setSvStatus] = useState<SVStatus>('idle');
  const [svLocation, setSvLocation] = useState<StreetViewLocation | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);

  const openStreetView = useCallback(
    (lat: number, lng: number) => {
      if (!window.google?.maps?.StreetViewService) return;

      setSvStatus('loading');

      const svService = new window.google.maps.StreetViewService();
      svService.getPanorama(
        { location: { lat, lng }, radius: 80, preference: window.google.maps.StreetViewPreference.NEAREST },
        (data, status) => {
          if (status === window.google.maps.StreetViewStatus.OK && data?.location?.latLng) {
            const snappedLat = data.location.latLng.lat();
            const snappedLng = data.location.latLng.lng();
            setSvLocation({ lat: snappedLat, lng: snappedLng });
            setSvStatus('open');
          } else {
            setSvStatus('unavailable');
            // Auto-dismiss the "unavailable" toast after 3 s
            setTimeout(() => setSvStatus('idle'), 3000);
          }
        }
      );
    },
    []
  );

  const closeStreetView = useCallback((mapInstance: google.maps.Map | null) => {
    // Detach panorama from map so map returns to normal
    if (panoramaRef.current) {
      panoramaRef.current.setVisible(false);
    }
    if (mapInstance) {
      mapInstance.setStreetView(null as unknown as google.maps.StreetViewPanorama);
    }
    setSvStatus('idle');
    setSvLocation(null);
    panoramaRef.current = null;
  }, []);

  return { svStatus, svLocation, panoramaRef, openStreetView, closeStreetView };
}
