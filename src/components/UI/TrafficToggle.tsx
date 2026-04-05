import { Cloud, CloudOff } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';
import { motion } from 'framer-motion';

export default function TrafficToggle() {
  const { showTraffic, setShowTraffic } = useNavigationStore();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group"
    >
      <motion.button
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setShowTraffic(!showTraffic)}
        aria-label={showTraffic ? 'Hide traffic layer' : 'Show traffic layer'}
        className="w-12 h-12 flex items-center justify-center rounded-2xl border shadow-lg backdrop-blur-xl overflow-hidden relative transition-all duration-300"
        style={{
          background: showTraffic
            ? 'rgba(234,179,8,0.18)'
            : 'rgba(15,23,42,0.82)',
          borderColor: showTraffic
            ? 'rgba(234,179,8,0.45)'
            : 'rgba(255,255,255,0.1)',
          boxShadow: showTraffic
            ? '0 0 0 1px rgba(234,179,8,0.3), 0 0 18px rgba(234,179,8,0.15), 0 4px 16px rgba(0,0,0,0.4)'
            : '0 4px 16px rgba(0,0,0,0.35)',
        }}
      >
        {/* Top shimmer */}
        <div className="absolute top-0 left-2 right-2 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />

        <motion.div
          animate={{ rotate: showTraffic ? 0 : 15, scale: showTraffic ? 1 : 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {showTraffic
            ? <Cloud size={20} style={{ color: '#FDE047' }} />
            : <CloudOff size={20} style={{ color: '#9CA3AF' }} />
          }
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
            {showTraffic ? 'Hide traffic layer' : 'Show traffic layer'}
          </p>
        </div>
        <div className="absolute -top-[5px] right-4 w-2.5 h-2.5 rotate-45"
          style={{ background: 'rgba(10,14,26,0.95)', borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)' }} />
      </div>
    </motion.div>
  );
}
