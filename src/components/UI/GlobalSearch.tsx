import { Search, Menu } from 'lucide-react';
import LocationSearchInput from './LocationSearchInput';
import { useNavigationStore } from '../../store/useNavigationStore';
import { motion } from 'framer-motion';
import { CornerUpRight } from 'lucide-react';

interface GlobalSearchProps {
  onMenuClick: () => void;
  mapRef: React.RefObject<google.maps.Map | null>;
}

export default function GlobalSearch({ onMenuClick, mapRef }: GlobalSearchProps) {
  const { setEndLocation } = useNavigationStore();

  const handleLocationSelect = (location: any) => {
    if (location) {
      setEndLocation(location);
      
      // Pan to the location like Google Maps but keep sidebar closed
      if (mapRef.current) {
        mapRef.current.panTo({ lat: location.lat, lng: location.lng });
        mapRef.current.setZoom(17);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute top-6 left-6 z-[20] flex items-center gap-3 w-full max-w-[450px]"
    >
      <div className="flex-1 flex items-center bg-dark-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] pr-2 hover:border-white/20 transition-all">
        {/* Menu button */}
        <button 
          onClick={onMenuClick}
          className="p-4 mr-1 text-gray-400 hover:text-white transition-colors border-r border-white/5"
          title="Open Navigation"
        >
          <Menu size={20} />
        </button>

        {/* The Search Input itself — without its internal background */}
        <div className="flex-1 py-1 custom-location-input">
          <LocationSearchInput 
            placeholder="Search place or enter coordinates (lat, lng)" 
            icon={<Search size={18} className="text-primary-green/60" />}
            onLocationSelect={handleLocationSelect}
          />
        </div>
      </div>

      {/* Quick navigation toggle — small circle to match Google Maps UI */}
      <motion.button
        onClick={onMenuClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Get Directions" // CHANGED from "Planning Mode"
        className="w-14 h-14 bg-primary-green rounded-full shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center justify-center text-dark-900 hover:bg-primary-green/90 transition-colors pointer-events-auto"
      >
        <CornerUpRight size={26} strokeWidth={2.5} />
      </motion.button>

      <style>{`
        .custom-location-input .bg-dark-800\\/80 {
          background: transparent !important;
          border: none !important;
          padding-left: 0 !important;
        }
      `}</style>
    </motion.div>
  );
}
