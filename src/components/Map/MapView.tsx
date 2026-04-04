import { GoogleMap, Marker, Circle, DirectionsRenderer, OverlayView } from '@react-google-maps/api';
import { useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, MapPin, X, Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import RoutePolylines from './RoutePolylines.tsx';
import { useNavigationStore } from '../../store/useNavigationStore.ts';
import { MapDarkTheme } from './MapDarkTheme.ts';
import { useDirections } from '../../hooks/useDirections.ts';
import type { UserLocation } from '../../hooks/useUserLocation.ts';
import type { NavState } from '../../hooks/useNavigation.ts';

interface MapViewProps {
  userLocation?: UserLocation | null;
  isLocationEnabled?: boolean;
  mapRef?: React.MutableRefObject<google.maps.Map | null>;
  navState?: Pick<NavState, 'isNavigating' | 'currentLat' | 'currentLng' | 'currentStepIndex' | 'steps' | 'heading' | 'navDirectionsResult'>;
}

const containerStyle = { width: '100vw', height: '100vh' };
const center = {
  lat: 12.9352,
  lng: 77.6245
};

export default function MapView({ userLocation, isLocationEnabled, mapRef: externalMapRef, navState }: MapViewProps) {
  const store = useNavigationStore();
  const [, setMap] = useState<google.maps.Map | null>(null);
  const internalMapRef = useRef<google.maps.Map | null>(null);
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

  // Keep ref in sync with state
  useEffect(() => { isFollowingRef.current = isFollowing; }, [isFollowing]);

  // Reset follow mode whenever navigation starts / stops
  useEffect(() => {
    if (navState?.isNavigating) {
      setIsFollowing(true);
    } else {
      // Exit nav: restore flat map
      const map = internalMapRef.current;
      if (map) {
        map.setHeading(0);
        map.setTilt(0);
      }
    }
  }, [navState?.isNavigating]);

  // ── Camera follow + rotation on every GPS update ─────────────────────────
  useEffect(() => {
    if (!navState?.isNavigating) return;
    if (navState.currentLat === null || navState.currentLng === null) return;

    const map = internalMapRef.current;
    if (!map) return;

    const lat = navState.currentLat;
    const lng = navState.currentLng;
    const heading = navState.heading ?? 0;

    // Smooth heading: only update when heading changes meaningfully (avoid GPS jitter)
    const headingDelta = Math.abs(heading - lastHeadingRef.current);
    if (heading !== 0 && headingDelta > 5) {
      lastHeadingRef.current = heading;
      map.setHeading(heading);
      map.setTilt(45);
    }

    if (isFollowingRef.current) {
      map.panTo({ lat, lng });
    }
  }, [navState?.currentLat, navState?.currentLng, navState?.heading, navState?.isNavigating]);

  // ── Recenter handler ──────────────────────────────────────────────────────
  const handleRecenter = useCallback(() => {
    const map = internalMapRef.current;
    if (!map) return;

    const lat = navState?.currentLat;
    const lng = navState?.currentLng;
    if (lat == null || lng == null) return;

    setIsFollowing(true);
    map.panTo({ lat, lng });
    map.setZoom(17);

    const heading = navState?.heading ?? 0;
    if (heading !== 0) {
      map.setHeading(heading);
      map.setTilt(45);
    }
  }, [navState?.currentLat, navState?.currentLng, navState?.heading]);

  // ── Map lifecycle ─────────────────────────────────────────────────────────
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    internalMapRef.current = map;
    if (externalMapRef) externalMapRef.current = map;
  }, [externalMapRef]);

  const onUnmount = useCallback(() => {
    setMap(null);
    internalMapRef.current = null;
    if (externalMapRef) externalMapRef.current = null;
  }, [externalMapRef]);

  // ── Directions / marker drag ──────────────────────────────────────────────
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

  // ── Safety Segments ──────────────────────────────────────────────────────
  const [nearbySegments, setNearbySegments] = useState<any[]>([]);
  const fetchTimeoutRef = useRef<any>(null);

  const fetchNearbySegments = useCallback(async (lat: number, lng: number) => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);

    fetchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/segments/nearby?lat=${lat}&lng=${lng}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setNearbySegments(data);
        } else if (data.status === 'no_data') {
          setNearbySegments([]);
        }
      } catch (err) {
        console.error('Failed to fetch segments:', err);
      }
    }, 300); // 300ms debounce
  }, []);

  const handleMapIdle = useCallback(() => {
    const map = internalMapRef.current;
    if (!map || isNav) return;
    const center = map.getCenter();
    if (!center) return;
    fetchNearbySegments(center.lat(), center.lng());
  }, [fetchNearbySegments, isNav]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng || isNav) return;
    setCoordsTooltip(null); // Dismiss tooltip on single click
    fetchNearbySegments(e.latLng.lat(), e.latLng.lng());
  }, [fetchNearbySegments, isNav]);

  const handleMapDblClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    setCoordsTooltip({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  }, []);

  const getColor = (env: number) => {
    if (env > 0.7) return "#4ADE80"; // green-400
    if (env > 0.4) return "#FACC15"; // yellow-400
    return "#F87171"; // red-400
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        onLoad={onLoad}
        onUnmount={onUnmount}
        mapTypeId={mapType}
        onIdle={handleMapIdle}
        onClick={handleMapClick}
        onDblClick={handleMapDblClick}
        /* Detect user panning map — breaks camera follow */
        onDragStart={() => { if (isNav) setIsFollowing(false); setCoordsTooltip(null); }}
        options={{
          styles: MapDarkTheme,
          disableDefaultUI: true,
          zoomControl: false,
          clickableIcons: false,
          disableDoubleClickZoom: true, // Disable zoom to focus on tooltip
          rotateControl: false,    // we manage rotation ourselves
        }}
      >
        {/* Route: DirectionsRenderer (nav) or RoutePolylines (browsing) */}
        {isNav && navState.navDirectionsResult ? (
          <>
            {/* Border layer — wider, darker, renders first (below) */}
            <DirectionsRenderer
              directions={navState.navDirectionsResult}
              routeIndex={0}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#1a56c4',
                  strokeWeight: 13,
                  strokeOpacity: 0.85,
                  zIndex: 8,
                },
              }}
            />
            {/* Fill layer — main blue, narrower, renders on top */}
            <DirectionsRenderer
              directions={navState.navDirectionsResult}
              routeIndex={0}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#4285F4',
                  strokeWeight: 7,
                  strokeOpacity: 1,
                  zIndex: 10,
                },
              }}
            />
          </>
        ) : (
          <RoutePolylines />
        )}

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
        {!isNav && isLocationEnabled && userLocation && (
          <>
            <Circle
              center={{ lat: userLocation.lat, lng: userLocation.lng }}
              radius={userLocation.accuracy ?? 30}
              options={{ fillColor: '#4285F4', fillOpacity: 0.15, strokeOpacity: 0, clickable: false }}
            />
            <Marker
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
          </>
        )}

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
            fillColor: '#4285F4',
            fillOpacity: 0.03,
            strokeColor: '#4285F4',
            strokeOpacity: 0.2,
            strokeWeight: 2,
            clickable: false,
            zIndex: 1
          }}
        />

        {/* Safety Segment Markers */}
        {!isNav && nearbySegments.map((seg) => (
          <Marker
            key={seg.segment_id}
            position={seg.midpoint}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: getColor(seg.features.environment),
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#ffffff',
            }}
            zIndex={5}
          />
        ))}

        {/* Navigation arrow at user's GPS position */}
        {isNav && navState.currentLat !== null && navState.currentLng !== null && (
          <Marker
            position={{ lat: navState.currentLat!, lng: navState.currentLng! }}
            zIndex={40}
            clickable={false}
            icon={{
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              rotation: navState.heading ?? 0,
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
