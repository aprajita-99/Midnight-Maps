import { Moon, Sun } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';
import { motion } from 'framer-motion';

export default function TimeModeToggle() {
  const { isDemoNightMode, setDemoNightMode } = useNavigationStore();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group"
    >
      <motion.button
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setDemoNightMode(!isDemoNightMode)}
        aria-label={isDemoNightMode ? 'Switch to Day Mode' : 'Switch to Night Mode'}
        className="w-12 h-12 flex items-center justify-center rounded-2xl border shadow-lg backdrop-blur-xl overflow-hidden relative transition-all duration-300"
        style={{
          background: isDemoNightMode
            ? 'rgba(99,102,241,0.22)'
            : 'rgba(15,23,42,0.82)',
          borderColor: isDemoNightMode
            ? 'rgba(99,102,241,0.5)'
            : 'rgba(255,255,255,0.1)',
          boxShadow: isDemoNightMode
            ? '0 0 0 1px rgba(99,102,241,0.35), 0 0 20px rgba(99,102,241,0.2), 0 4px 16px rgba(0,0,0,0.45)'
            : '0 4px 16px rgba(0,0,0,0.35)',
        }}
      >
        {/* Top shimmer */}
        <div className="absolute top-0 left-2 right-2 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />

        <motion.div
          animate={{ rotate: isDemoNightMode ? 360 : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          {isDemoNightMode
            ? <Moon size={20} fill="currentColor" style={{ color: '#818cf8' }} />
            : <Sun size={20} style={{ color: '#9CA3AF' }} />
          }
        </motion.div>
      </motion.button>

      {/* Tooltip */}
      <div className="absolute right-14 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50">
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
            {isDemoNightMode ? 'Switch to Auto Time' : 'Switch to Midnight Demo'}
          </p>
          <p className="text-[9px] text-gray-500 mt-0.5 tracking-tight font-bold uppercase">
            {isDemoNightMode ? 'Syncing with Clock' : 'Forcing Midnight Slot'}
          </p>
        </div>
        {/* Caret pointing right */}
        <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rotate-45"
          style={{ background: 'rgba(10,14,26,0.95)', borderRight: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
      </div>
    </motion.div>
  );
}
