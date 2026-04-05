import { ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ActionButtons() {
  return (
    /* Report unsafe zone button */
    <div className="relative group">
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.93 }}
          aria-label="Report unsafe zone"
          className="w-12 h-12 flex items-center justify-center rounded-2xl border shadow-lg backdrop-blur-xl overflow-hidden relative transition-all duration-300"
          style={{
            background: 'rgba(15,23,42,0.82)',
            borderColor: 'rgba(255,255,255,0.1)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.4)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 1px rgba(239,68,68,0.25), 0 0 16px rgba(239,68,68,0.15), 0 4px 16px rgba(0,0,0,0.4)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(15,23,42,0.82)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.35)';
          }}
        >
          {/* Top shimmer */}
          <div className="absolute top-0 left-2 right-2 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
          <ShieldAlert size={20} style={{ color: '#9CA3AF' }} className="transition-colors duration-300 group-hover:text-red-400" />
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
            <p className="text-[11px] font-medium text-gray-300">Report unsafe zone</p>
          </div>
          <div className="absolute -top-[5px] right-4 w-2.5 h-2.5 rotate-45"
            style={{ background: 'rgba(10,14,26,0.95)', borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
      </div>
  );
}
