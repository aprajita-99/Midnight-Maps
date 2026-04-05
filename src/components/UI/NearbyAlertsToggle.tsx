import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Store } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';

export default function NearbyAlertsToggle() {
  const { showNearbyAlerts, setShowNearbyAlerts } = useNavigationStore();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group"
    >
      <button
        onClick={() => setShowNearbyAlerts(!showNearbyAlerts)}
        aria-label={showNearbyAlerts ? 'Hide nearby police and open shops' : 'Show nearby police and open shops'}
        className="relative w-12 h-12 flex items-center justify-center rounded-2xl border shadow-lg backdrop-blur-xl overflow-hidden transition-all duration-300"
        style={{
          background: showNearbyAlerts
            ? 'linear-gradient(135deg, rgba(239,68,68,0.22) 0%, rgba(168,85,247,0.15) 100%)'
            : 'rgba(15,23,42,0.82)',
          borderColor: showNearbyAlerts
            ? 'rgba(239,68,68,0.5)'
            : 'rgba(255,255,255,0.1)',
          boxShadow: showNearbyAlerts
            ? '0 0 0 1px rgba(239,68,68,0.3), 0 0 20px rgba(239,68,68,0.2), 0 4px 16px rgba(0,0,0,0.4)'
            : '0 4px 16px rgba(0,0,0,0.35)',
        }}
      >
        {/* Ambient glow blob when active */}
        <AnimatePresence>
          {showNearbyAlerts && (
            <motion.div
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 60% 40%, rgba(239,68,68,0.3) 0%, rgba(168,85,247,0.15) 50%, transparent 75%)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Pulsing ring when active */}
        <AnimatePresence>
          {showNearbyAlerts && (
            <motion.div
              initial={{ opacity: 0.7, scale: 0.85 }}
              animate={{ opacity: 0, scale: 1.55 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ border: '1.5px solid rgba(239,68,68,0.6)' }}
            />
          )}
        </AnimatePresence>

        {/* Stacked Shield + Store icon */}
        <div className="relative flex items-center justify-center w-full h-full">
          <motion.div
            animate={{
              scale: showNearbyAlerts ? 1 : 0.9,
              opacity: showNearbyAlerts ? 1 : 0.6,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative"
          >
            {/* Shield (back) */}
            <Shield
              size={20}
              strokeWidth={2}
              style={{
                color: showNearbyAlerts ? '#F87171' : '#9CA3AF',
                filter: showNearbyAlerts ? 'drop-shadow(0 0 6px rgba(248,113,113,0.7))' : 'none',
                transition: 'color 0.3s, filter 0.3s',
              }}
            />
            {/* Store badge pinned to bottom-right of shield */}
            <div
              className="absolute -bottom-1 -right-1.5 rounded-full flex items-center justify-center"
              style={{
                width: 14,
                height: 14,
                background: showNearbyAlerts
                  ? 'linear-gradient(135deg, #A855F7, #7C3AED)'
                  : 'rgba(55,65,81,1)',
                border: showNearbyAlerts
                  ? '1.5px solid rgba(168,85,247,0.5)'
                  : '1.5px solid rgba(255,255,255,0.1)',
                boxShadow: showNearbyAlerts ? '0 0 6px rgba(168,85,247,0.5)' : 'none',
                transition: 'all 0.3s',
              }}
            >
              <Store
                size={8}
                strokeWidth={2.5}
                style={{ color: showNearbyAlerts ? '#E9D5FF' : '#6B7280' }}
              />
            </div>
          </motion.div>
        </div>

        {/* Top shimmer line */}
        <div
          className="absolute top-0 left-2 right-2 h-px pointer-events-none"
          style={{
            background: showNearbyAlerts
              ? 'linear-gradient(90deg, transparent, rgba(248,113,113,0.6), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          }}
        />
      </button>

      {/* Hover Tooltip */}
      <div
        className="absolute right-0 top-[calc(100%+8px)] pointer-events-none opacity-0 translate-y-1
                   group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50"
      >
        {/* Tooltip card */}
        <div
          className="rounded-xl px-3 py-2 whitespace-nowrap"
          style={{
            background: 'rgba(10,14,26,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Top shimmer */}
          <div
            className="absolute top-0 left-3 right-3 h-px rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            }}
          />

          <div className="flex items-center gap-2">
            {/* Police pill */}
            <div
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              <Shield size={10} strokeWidth={2.5} style={{ color: '#F87171' }} />
              <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#FCA5A5' }}>
                Police
              </span>
            </div>

            <span className="text-white/25 text-xs">+</span>

            {/* Shops pill */}
            <div
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
              style={{
                background: 'rgba(168,85,247,0.15)',
                border: '1px solid rgba(168,85,247,0.3)',
              }}
            >
              <Store size={10} strokeWidth={2.5} style={{ color: '#C084FC' }} />
              <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#D8B4FE' }}>
                Open Shops
              </span>
            </div>
          </div>

          {/* Status blurb */}
          <p className="mt-1.5 text-[10px] text-gray-500 text-center tracking-wide">
            {showNearbyAlerts ? '● Showing nearby alerts' : 'Tap to show nearby alerts'}
          </p>
        </div>

        {/* Caret arrow pointing up */}
        <div
          className="absolute -top-[5px] right-4 w-2.5 h-2.5 rotate-45"
          style={{
            background: 'rgba(10,14,26,0.95)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
          }}
        />
      </div>
    </motion.div>
  );
}
