import { Map, Satellite } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';
import { motion } from 'framer-motion';

export default function MapTypeToggle() {
  const { mapType, setMapType } = useNavigationStore();

  const isSatellite = mapType === 'hybrid';

  const toggleMapType = () => {
    setMapType(isSatellite ? 'roadmap' : 'hybrid');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute top-6 right-6 z-20 group"
    >
      <button
        onClick={toggleMapType}
        className="w-12 h-12 flex items-center justify-center rounded-2xl glass-panel bg-dark-800/80 hover:bg-white/10 border border-white/10 shadow-lg text-white transition-all overflow-hidden relative"
        aria-label={isSatellite ? "Switch to Map View" : "Switch to Satellite View"}
      >
        <motion.div
          initial={false}
          animate={{
            rotate: isSatellite ? 0 : -90,
            y: isSatellite ? 0 : 20,
            opacity: isSatellite ? 1 : 0
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Map size={22} className="text-primary-blue" />
        </motion.div>
        
        <motion.div
          initial={false}
          animate={{
            rotate: isSatellite ? 90 : 0,
            y: isSatellite ? -20 : 0,
            opacity: isSatellite ? 0 : 1
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Satellite size={22} className="text-gray-300" />
        </motion.div>
      </button>

      {/* Tooltip on hover */}
      <div className="absolute right-0 top-[120%] bg-dark-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:-translate-y-1 transition duration-200">
        {isSatellite ? "Switch to Map View" : "Switch to Satellite View"}
      </div>
    </motion.div>
  );
}
