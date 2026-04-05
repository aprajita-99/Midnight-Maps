import { BookOpen } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';
import { motion } from 'framer-motion';

export default function ReadmeToggle() {
  const { isReadmeOpen, setReadmeOpen } = useNavigationStore();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative group"
    >
      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: 'rgba(99,102,241,0.95)' }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setReadmeOpen(!isReadmeOpen)}
        className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border-2 shadow-2xl backdrop-blur-2xl transition-all duration-300 overflow-hidden relative group/btn"
        style={{
          background: isReadmeOpen 
            ? 'linear-gradient(135deg, rgba(99,102,241,0.9) 0%, rgba(79,70,229,0.9) 100%)'
            : 'rgba(15,23,42,0.92)',
          borderColor: isReadmeOpen 
            ? 'rgba(255,255,255,0.6)' 
            : 'rgba(99,102,241,0.4)',
          boxShadow: isReadmeOpen
            ? '0 0 30px rgba(99,102,241,0.5), inset 0 0 10px rgba(255,255,255,0.2)'
            : '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
        
        <BookOpen size={18} className={isReadmeOpen ? "text-white" : "text-indigo-400 group-hover/btn:text-white transition-colors animate-pulse"} />
        <span className="text-[12px] font-black uppercase tracking-[0.18em] text-white">
          README FIRST
        </span>
      </motion.button>

      {/* Tooltip */}
      {!isReadmeOpen && (
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-xl shadow-2xl whitespace-nowrap">
            <p className="text-[10px] font-bold text-white uppercase tracking-wider">Learn how it works</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
