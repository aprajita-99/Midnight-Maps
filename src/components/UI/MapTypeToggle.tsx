import { Map, Satellite } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';
import { motion } from 'framer-motion';

export default function MapTypeToggle() {
  const { mapType, setMapType } = useNavigationStore();
  const isSatellite = mapType === 'hybrid';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group"
    >
      <motion.button
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setMapType(isSatellite ? 'roadmap' : 'hybrid')}
        aria-label={isSatellite ? 'Switch to Map View' : 'Switch to Satellite View'}
        className="w-12 h-12 flex items-center justify-center rounded-2xl border shadow-lg backdrop-blur-xl overflow-hidden relative transition-all duration-300"
        style={{
          background: isSatellite
            ? 'rgba(59,130,246,0.18)'
            : 'rgba(15,23,42,0.82)',
          borderColor: isSatellite
            ? 'rgba(59,130,246,0.45)'
            : 'rgba(255,255,255,0.1)',
          boxShadow: isSatellite
            ? '0 0 0 1px rgba(59,130,246,0.3), 0 0 18px rgba(59,130,246,0.18), 0 4px 16px rgba(0,0,0,0.4)'
            : '0 4px 16px rgba(0,0,0,0.35)',
        }}
      >
        {/* Top shimmer */}
        <div className="absolute top-0 left-2 right-2 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />

        <motion.div
          animate={{ rotate: isSatellite ? 0 : -90, y: isSatellite ? 0 : 20, opacity: isSatellite ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Map size={20} style={{ color: '#60A5FA' }} />
        </motion.div>

        <motion.div
          animate={{ rotate: isSatellite ? 90 : 0, y: isSatellite ? -20 : 0, opacity: isSatellite ? 0 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Satellite size={20} style={{ color: '#9CA3AF' }} />
        </motion.div>
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
            {isSatellite ? 'Switch to Map View' : 'Switch to Satellite View'}
          </p>
        </div>
        <div className="absolute -top-[5px] right-4 w-2.5 h-2.5 rotate-45"
          style={{ background: 'rgba(10,14,26,0.95)', borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)' }} />
      </div>
    </motion.div>
  );
}
