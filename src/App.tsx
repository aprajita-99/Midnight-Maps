import { useRef, useEffect, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import MapView from './components/Map/MapView';
import SearchBar from './components/UI/SearchBar';
import BottomPanel from './components/UI/BottomPanel';
import GlobalSearch from './components/UI/GlobalSearch';

import MapTypeToggle from './components/UI/MapTypeToggle';
import LocationControl from './components/UI/LocationControl';
import PegmanControl from './components/UI/PegmanControl';
import StreetViewPanel from './components/Map/StreetViewPanel';
import NavigationHUD from './components/UI/NavigationHUD';
import RouteMetricsOverlay from './components/UI/RouteMetricsOverlay';
import TrafficToggle from './components/UI/TrafficToggle';
import NearbyAlertsToggle from './components/UI/NearbyAlertsToggle';
import CameraToggle from './components/UI/CameraToggle';
import LampToggle from './components/UI/LampToggle';
import TimeModeToggle from './components/UI/TimeModeToggle';
import { useUserLocation } from './hooks/useUserLocation';
import { useStreetView } from './hooks/useStreetView';
import { useNavigation } from './hooks/useNavigationController';
import { useNavigationStore } from './store/useNavigationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Navigation } from 'lucide-react';
import TripSummaryModal from './components/UI/TripSummaryModal';
import ReadmeToggle from './components/UI/ReadmeToggle';
import ReadmeSidebar from './components/UI/ReadmeSidebar';
import LoadingScreen from './components/UI/LoadingScreen';

const DUMMY_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
type Library = 'places' | 'drawing' | 'geometry' | 'visualization';
const libraries: Library[] = ['places'];

function App() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: DUMMY_API_KEY,
    libraries,
  });

  const [isSafetyInspectorActive, setIsSafetyInspectorActive] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);
  const locationHook = useUserLocation();
  const { userLocation, isLocationEnabled } = locationHook;

  const streetViewHook = useStreetView();
  const { svStatus, svLocation, panoramaRef, openStreetView, closeStreetView } = streetViewHook;

  const nav = useNavigation();
  const { isNavigating } = nav;

  // Store values for the sticky simulate button
  const { directionsResult, startLocation, endLocation, isLoading: routeLoading, isInitialLoading, finishInitialLoading, isSimulationPaused } = useNavigationStore();
  const isRouteReady = startLocation !== null && endLocation !== null && !!directionsResult && !routeLoading;

  // Sidebar visible when NOT navigating, OR when paused mid-navigation
  const showSidebar = !isNavigating || isSimulationPaused;

  useEffect(() => {
    const timer = setTimeout(() => {
      finishInitialLoading();
    }, 1900);
    return () => clearTimeout(timer);
  }, [finishInitialLoading]);

  const handlePegmanDrop = (lat: number, lng: number) => {
    openStreetView(lat, lng);
  };

  // Pan & zoom map when location is first acquired
  useEffect(() => {
    if (isLocationEnabled && userLocation && mapRef.current && !isNavigating) {
      mapRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      mapRef.current.setZoom(16);
    }
  }, [isLocationEnabled, userLocation, isNavigating]);

  if (loadError) return (
    <div className="w-screen h-screen flex items-center justify-center bg-dark-900 text-white font-sans">
      Error loading maps
    </div>
  );

  if (!isLoaded) return (
    <div className="w-screen h-screen flex flex-col gap-4 items-center justify-center bg-dark-900 text-white font-sans">
      <div className="w-8 h-8 rounded-full border-t-2 border-primary-green animate-spin" />
      Loading Map...
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden font-sans selection:bg-primary-green/30"
      style={{ background: '#0a0e1a' }}>

      {/* ── Main body ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
        <motion.aside
          animate={{
            width: showSidebar ? 380 : 0,
            opacity: showSidebar ? 1 : 0,
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 38 }}
          className="flex-shrink-0 flex flex-col border-r shadow-2xl relative z-30 overflow-hidden"
          style={{
            background: 'rgba(10,14,26,0.97)',
            borderColor: 'rgba(255,255,255,0.06)',
            backgroundImage: `
              radial-gradient(1px 1px at 20px 30px, white, rgba(0,0,0,0)),
              radial-gradient(1px 1px at 40px 70px, white, rgba(0,0,0,0)),
              radial-gradient(1.5px 1.5px at 50px 160px, white, rgba(0,0,0,0)),
              radial-gradient(1px 1px at 80px 120px, white, rgba(0,0,0,0)),
              radial-gradient(1px 1px at 110px 10px, white, rgba(0,0,0,0)),
              radial-gradient(1.5px 1.5px at 150px 50px, white, rgba(0,0,0,0)),
              radial-gradient(1px 1px at 190px 90px, white, rgba(0,0,0,0)),
              radial-gradient(1px 1px at 210px 140px, white, rgba(0,0,0,0)),
              radial-gradient(1.5px 1.5px at 240px 30px, white, rgba(0,0,0,0)),
              radial-gradient(1px 1px at 260px 170px, white, rgba(0,0,0,0)),
              radial-gradient(1px 1px at 280px 80px, white, rgba(0,0,0,0)),
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '300px 200px, 400px 300px, 350px 250px, 450px 350px, 400px 400px, 40px 40px',
          }}
        >
          {/* Subtle green radial glow at top */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(34,197,94,0.07) 0%, transparent 55%)' }} />

          {/* ── Branding ────────────────────────────────────────────── */}
          <div className="relative flex items-center gap-3 px-5 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
              style={{
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.28)',
                boxShadow: '0 0 14px rgba(34,197,94,0.15)',
              }}>
              <img src="/favicon.png" alt="Midnight Maps" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold tracking-tight" style={{ fontSize: '20px', color: '#f1f5f9', letterSpacing: '-0.02em' }}>
              Midnight Maps
            </span>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {/* Global Search */}
            <div className="relative px-4 py-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
              <GlobalSearch mapRef={mapRef} />
            </div>

            {/* Route Search Section (Travel Modes + Inputs) */}
            <div className="relative p-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
              <SearchBar />
            </div>

            {/* Results Section (Route Cards + Insights) */}
            <div className="p-4 relative">
              <BottomPanel nav={nav} mapRef={mapRef} showSimulateButton={false} />
            </div>
          </div>

          {/* Sticky Simulate Button at sidebar bottom */}
          <AnimatePresence>
            {isRouteReady && !isNavigating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex-shrink-0 p-4 relative"
                style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}
              >
                {/* Glow behind button */}
                <div className="absolute inset-x-4 top-0 h-px pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.3), transparent)' }} />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => nav.startNavigation(mapRef)}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#0a0e1a',
                    boxShadow: '0 0 24px rgba(34,197,94,0.25), 0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {/* Shimmer */}
                  <div className="absolute top-0 left-4 right-4 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }} />
                  <Navigation size={16} fill="currentColor" />
                  Start Simulation
                </motion.button>
              </motion.div>
            )}
            {isNavigating && isSimulationPaused && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex-shrink-0 p-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}
              >
                <div className="w-full py-3 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 text-yellow-400"
                  style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                  <Navigation size={13} fill="currentColor" />
                  Simulation Paused
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Hackathon Disclaimer Footer ────────────────────────────── */}
          <div className="mt-auto px-6 py-4 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
            <p className="text-[10px] text-gray-500 leading-normal text-center italic font-medium opacity-80 uppercase tracking-widest leading-relaxed">
              Some parts are for demonstration purpose only for hackathon and won't be present in actual product
            </p>
          </div>
        </motion.aside>

        {/* Readme Sidebar Overlay */}
        <AnimatePresence>
          <ReadmeSidebar />
        </AnimatePresence>

        {/* ── Map Frame ──────────────────────────────────────────────────────── */}
        <motion.div
          animate={{ padding: isNavigating && !isSimulationPaused ? 0 : 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 38 }}
          className="flex-1 min-w-0 min-h-0"
        >
          <div className="relative w-full h-full rounded-2xl overflow-hidden"
            style={{
              boxShadow: isNavigating && !isSimulationPaused
                ? 'none'
                : '0 0 0 2px #0a0e1a, 0 0 0 4px white, 0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Map fills the frame */}
            <MapView
              userLocation={userLocation}
              isLocationEnabled={isLocationEnabled}
              mapRef={mapRef}
              navState={nav}
              safetyInspectorActive={isSafetyInspectorActive}
            />

            {/* ── Map Controls Column (top-right inside frame) ── */}
            {svStatus !== 'open' && (
              <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 items-end">
                <ReadmeToggle />
                {!isNavigating && <MapTypeToggle />}
                {!isNavigating && <TrafficToggle />}
                <NearbyAlertsToggle />
                <CameraToggle />
                <LampToggle />
                <TimeModeToggle />
                {!isNavigating && (
                  <LocationControl
                    {...locationHook}
                    onUseAsStart={() => { }}
                  />
                )}
                {!isNavigating && (
                  <PegmanControl
                    mapRef={mapRef}
                    onDropCoords={handlePegmanDrop}
                  />
                )}
                {/* Safety Inspector button */}
                {!isNavigating && (
                  <div className="relative group">
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.07 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setIsSafetyInspectorActive(v => !v)}
                      aria-label={isSafetyInspectorActive ? 'Close Safety Inspector' : 'Open Safety Inspector'}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl border shadow-lg backdrop-blur-xl overflow-hidden relative transition-all duration-300"
                      style={{
                        background: isSafetyInspectorActive ? 'rgba(34,197,94,0.18)' : 'rgba(15,23,42,0.82)',
                        borderColor: isSafetyInspectorActive ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.1)',
                        boxShadow: isSafetyInspectorActive
                          ? '0 0 0 1px rgba(34,197,94,0.3), 0 0 18px rgba(34,197,94,0.18), 0 4px 16px rgba(0,0,0,0.4)'
                          : '0 4px 16px rgba(0,0,0,0.35)',
                      }}
                    >
                      <div className="absolute top-0 left-2 right-2 h-px pointer-events-none"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
                      <Shield size={20}
                        style={{ color: isSafetyInspectorActive ? '#4ade80' : '#9CA3AF' }}
                        className="transition-colors duration-300" />
                    </motion.button>
                    {/* Tooltip */}
                    <div className="absolute right-0 top-[calc(100%+8px)] pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50">
                      <div className="relative rounded-xl px-3 py-2 whitespace-nowrap"
                        style={{
                          background: 'rgba(10,14,26,0.95)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                          backdropFilter: 'blur(16px)',
                        }}>
                        <p className="text-[11px] font-medium text-gray-300">
                          {isSafetyInspectorActive ? 'Close Safety Inspector' : 'Street Safety Inspector'}
                        </p>
                      </div>
                      <div className="absolute -top-[5px] right-4 w-2.5 h-2.5 rotate-45"
                        style={{ background: 'rgba(10,14,26,0.95)', borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Street View overlay (absolute inset-0, stays in frame) */}
            <StreetViewPanel
              svStatus={svStatus}
              svLocation={svLocation}
              panoramaRef={panoramaRef}
              mapRef={mapRef}
              onClose={() => closeStreetView(mapRef.current)}
            />

            {/* Route Metrics (hidden during nav/sv) */}
            {!isNavigating && svStatus !== 'open' && <RouteMetricsOverlay />}

            {/* Trip Feedback and Navigation HUD are now contained within this frame */}
            <TripSummaryModal nav={nav} />
            <NavigationHUD nav={nav} />
          </div>
        </motion.div>
      </div>
      <AnimatePresence>
        {isInitialLoading && <LoadingScreen />}
      </AnimatePresence>
    </div>
  );
}

export default App;
