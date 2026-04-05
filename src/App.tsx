import { useState, useRef, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import MapView from './components/Map/MapView';
import SearchBar from './components/UI/SearchBar';
import BottomPanel from './components/UI/BottomPanel';
import ActionButtons from './components/UI/ActionButtons';
import MapTypeToggle from './components/UI/MapTypeToggle';
import LocationControl from './components/UI/LocationControl';
import PegmanControl from './components/UI/PegmanControl';
import StreetViewPanel from './components/Map/StreetViewPanel';
import NavigationHUD from './components/UI/NavigationHUD';
import GlobalSearch from './components/UI/GlobalSearch';
import RouteMetricsOverlay from './components/UI/RouteMetricsOverlay';
import { useUserLocation } from './hooks/useUserLocation';
import { useStreetView } from './hooks/useStreetView';
import { useNavigation } from './hooks/useNavigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
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

  // Automatically close sidebar when navigation starts OR Street View opens
  useEffect(() => {
    if (isNavigating || svStatus === 'open') {
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
        />
        {!isNavigating && (
          <>
            <ActionButtons />
            <MapTypeToggle />
            <LocationControl
              {...locationHook}
              onUseAsStart={() => setIsSidebarOpen(true)}
            />
          </>
        )}
        {/* Pegman — hidden during navigation or Street View */}
        {svStatus !== 'open' && !isNavigating && (
          <PegmanControl
            mapRef={mapRef}
            onDropCoords={handlePegmanDrop}
          />
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
