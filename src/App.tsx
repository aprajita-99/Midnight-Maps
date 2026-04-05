import { useState, useRef, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import MapView from './components/Map/MapView';
import SearchBar from './components/UI/SearchBar';
import BottomPanel from './components/UI/BottomPanel';
import MapTypeToggle from './components/UI/MapTypeToggle';
import LocationControl from './components/UI/LocationControl';
import PegmanControl from './components/UI/PegmanControl';
import StreetViewPanel from './components/Map/StreetViewPanel';
import NavigationHUD from './components/UI/NavigationHUD';
import GlobalSearch from './components/UI/GlobalSearch';
import RouteMetricsOverlay from './components/UI/RouteMetricsOverlay';
import TrafficToggle from './components/UI/TrafficToggle';
import NearbyAlertsToggle from './components/UI/NearbyAlertsToggle';
import { useUserLocation } from './hooks/useUserLocation';
import { useStreetView } from './hooks/useStreetView';
import { useNavigation } from './hooks/useNavigationController';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield } from 'lucide-react';
import TripSummaryModal from './components/UI/TripSummaryModal';

const DUMMY_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
type Library = "places" | "drawing" | "geometry" | "visualization";
const libraries: Library[] = ['places'];

function App() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: DUMMY_API_KEY,
    libraries
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSafetyInspectorActive, setIsSafetyInspectorActive] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);
  const locationHook = useUserLocation();
  const { userLocation, isLocationEnabled } = locationHook;

  const streetViewHook = useStreetView();
  const { svStatus, svLocation, panoramaRef, openStreetView, closeStreetView } = streetViewHook;

  const nav = useNavigation();
  const { isNavigating } = nav;

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

  // Keep the sidebar visible during simulation and only collapse it for Street View.
  useEffect(() => {
    if (svStatus === 'open') {
      setIsSidebarOpen(false);
    }
  }, [isNavigating, svStatus]);

  if (loadError) return <div className="w-screen h-screen flex items-center justify-center bg-dark-900 text-white font-sans">Error loading maps</div>;
  if (!isLoaded) return <div className="w-screen h-screen flex flex-col gap-4 items-center justify-center bg-dark-900 text-white font-sans"><div className="w-8 h-8 rounded-full border-t-2 border-primary-green animate-spin" />Loading Map...</div>;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dark-900 font-sans selection:bg-primary-green/30">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-green/5 via-dark-900 to-dark-900 z-0" />
      
      {/* Sidebar Panel */}
      <motion.div 
        initial={false}
        animate={{ 
          marginLeft: isSidebarOpen ? 0 : -420 
        }}
        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
        className="w-full md:w-[420px] flex-shrink-0 bg-dark-900/90 backdrop-blur-xl border-r border-white/10 z-30 flex flex-col shadow-2xl relative"
      >
        <div className="p-6 border-b border-white/5 relative">
          <button 
            onClick={() => setIsSidebarOpen(false)}
            title="Close sidebar"
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white mb-6 pr-8">Night Navigator <span className="text-xs tracking-widest text-primary-green block mt-1 uppercase">Fear-Free</span></h1>
          <SearchBar />
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
          <BottomPanel nav={nav} mapRef={mapRef} />
        </div>
      </motion.div>

      {/* Map Area */}
      <div className="flex-1 relative z-0 min-w-0">
        <MapView
          userLocation={userLocation}
          isLocationEnabled={isLocationEnabled}
          mapRef={mapRef}
          navState={nav}
          safetyInspectorActive={isSafetyInspectorActive}
        />
        {svStatus !== 'open' && (
          <div className="absolute top-6 right-6 z-20 flex flex-col gap-2 items-end">
            {!isNavigating && <MapTypeToggle />}
            {!isNavigating && <TrafficToggle />}
            <NearbyAlertsToggle />
            {!isNavigating && (
              <LocationControl
                {...locationHook}
                onUseAsStart={() => setIsSidebarOpen(true)}
              />
            )}
            {!isNavigating && (
              <PegmanControl
                mapRef={mapRef}
                onDropCoords={handlePegmanDrop}
              />
            )}
            {/* Safety Inspector icon button */}
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
                    background: isSafetyInspectorActive
                      ? 'rgba(34,197,94,0.18)'
                      : 'rgba(15,23,42,0.82)',
                    borderColor: isSafetyInspectorActive
                      ? 'rgba(34,197,94,0.45)'
                      : 'rgba(255,255,255,0.1)',
                    boxShadow: isSafetyInspectorActive
                      ? '0 0 0 1px rgba(34,197,94,0.3), 0 0 18px rgba(34,197,94,0.18), 0 4px 16px rgba(0,0,0,0.4)'
                      : '0 4px 16px rgba(0,0,0,0.35)',
                  }}
                >
                  {/* Top shimmer */}
                  <div className="absolute top-0 left-2 right-2 h-px pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
                  <Shield
                    size={20}
                    style={{ color: isSafetyInspectorActive ? '#4ade80' : '#9CA3AF' }}
                    className="transition-colors duration-300"
                  />
                </motion.button>
                {/* Tooltip */}
                <div className="absolute right-0 top-[calc(100%+8px)] pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50">
                  <div className="relative rounded-xl px-3 py-2 whitespace-nowrap"
                    style={{
                      background: 'rgba(10,14,26,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(16px)',
                    }}>
                    <div className="absolute top-0 left-3 right-3 h-px rounded-full"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
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
        {/* Street View overlay */}
        <StreetViewPanel
          svStatus={svStatus}
          svLocation={svLocation}
          panoramaRef={panoramaRef}
          mapRef={mapRef}
          onClose={() => closeStreetView(mapRef.current)}
        />
        <NavigationHUD nav={nav} />
        {!isNavigating && svStatus !== 'open' && <RouteMetricsOverlay />}
        
        {/* Global Search Bar — replace the mini panel */}
        <AnimatePresence>
          {!isSidebarOpen && !isNavigating && svStatus !== 'open' && (
            <GlobalSearch 
              onMenuClick={() => setIsSidebarOpen(true)} 
              mapRef={mapRef}
            />
          )}
        </AnimatePresence>
        <TripSummaryModal nav={nav} />
      </div>
    </div>
  );
}

export default App;
