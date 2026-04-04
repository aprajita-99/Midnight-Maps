import React from 'react';
import { useNavigationStore } from '../../store/useNavigationStore';
import RouteCard from './RouteCard';
import { Navigation, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UseNavigationReturn } from '../../hooks/useNavigation';
import RouteDetailsPanel from './RouteDetailsPanel';

interface BottomPanelProps {
  nav: UseNavigationReturn;
  mapRef: React.RefObject<google.maps.Map | null>;
}

export default function BottomPanel({ nav, mapRef }: BottomPanelProps) {
  const { 
    directionsResult, 
    selectedRouteIndex, 
    setSelectedRouteIndex,
    startLocation,
    endLocation,
    isLoading,
    error
  } = useNavigationStore();

  const { startNavigation } = nav;

  const isReady = startLocation !== null && endLocation !== null;

  return (
    <div className="flex flex-col gap-4 w-full pb-10">
      
      {/* Route List */}
      {directionsResult && directionsResult.routes.length > 0 && (
        <h2 className="text-lg font-bold text-white mb-2">Available Routes</h2>
      )}

      {/* Loading State state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Loader2 className="w-8 h-8 text-primary-green animate-spin" />
          <span className="text-gray-400 animate-pulse">Calculating optimal routes...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-primary-red/10 border border-primary-red/20 rounded-xl text-primary-red/90 text-sm">
          {error}
        </div>
      )}

      <AnimatePresence>
        {!isLoading && directionsResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4"
          >
            {directionsResult.routes.slice(0, 5).map((route, index) => (
              <React.Fragment key={`route-wrapper-${index}`}>
                <RouteCard 
                  route={route} 
                  index={index}
                  isSelected={selectedRouteIndex === index} 
                  onClick={() => setSelectedRouteIndex(index)} 
                />
                {/* ONLY show the detailed panel for the actively selected route */}
                {selectedRouteIndex === index && <RouteDetailsPanel />}
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start CTA (Only show when inputs are ready and routes are fetched) */}
      {isReady && directionsResult && !isLoading && (
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/10">
          {/* Start Navigation */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => startNavigation(mapRef)}
            className="w-full py-4 bg-primary-green text-dark-900 rounded-2xl font-bold shadow-xl cursor-pointer flex justify-center items-center gap-2 hover:bg-primary-green/90 transition"
          >
            <Navigation size={20} fill="currentColor" />
            Start Safe Navigation
          </motion.div>
        </div>
      )}
    </div>
  );
}