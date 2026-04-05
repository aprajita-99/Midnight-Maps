import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#020307',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      <motion.div
        animate={{ 
          scale: [1.1, 0.9],
          opacity: [0, 1, 1, 0] 
        }}
        transition={{ 
          duration: 2, 
          times: [0, 0.1, 0.8, 1],
          ease: "easeInOut" 
        }}
        className="flex items-center justify-center h-full w-full"
      >
        <img 
          src="/LoadingImage.jpeg" 
          alt="Midnight Maps" 
          className="h-auto w-auto max-h-[85vh] max-w-[85vw] object-contain"
        />
      </motion.div>
    </motion.div>
  );
}
