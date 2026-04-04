import { ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ActionButtons() {
  return (
    <div className="absolute right-6 bottom-6 flex flex-col gap-4 z-10 items-end">
      {/* Report Button */}
      <motion.div 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="w-14 h-14 bg-dark-800 rounded-full flex items-center justify-center border border-white/10 shadow-xl cursor-pointer text-gray-400 hover:text-primary-red hover:border-primary-red/50 transition-colors"
      >
        <ShieldAlert size={24} />
      </motion.div>
    </div>
  );
}
