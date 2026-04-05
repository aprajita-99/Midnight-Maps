import React from 'react';
import { useNavigationStore } from '../../store/useNavigationStore';
import RouteCard from './RouteCard';
import { Navigation, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UseNavigationReturn } from '../../hooks/useNavigationController';
import RouteInsightsPanel from './RouteInsightsPanel';

interface BottomPanelProps {
  nav: UseNavigationReturn;
  mapRef: React.RefObject<google.maps.Map | null>;
  showSimulateButton?: boolean;
}

export default function BottomPanel({ nav, mapRef, showSimulateButton = true }: BottomPanelProps) {
  const { 
    directionsResult, 
    selectedRouteIndex, 
    setSelectedRouteIndex,
    startLocation,
    endLocation,
    isLoading,
    error,
  } = useNavigationStore();

  const { startNavigation, isNavigating } = nav;

  const isReady = startLocation !== null && endLocation !== null;
  const visibleRoutes = directionsResult?.routes.slice(0, 3) ?? [];

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
          <span className="text-slate-200 font-medium animate-pulse">Calculating optimal routes...</span>
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
            {visibleRoutes.map((route, index) => (
              <React.Fragment key={`route-wrapper-${index}`}>
                <RouteCard 
                  route={route} 
                  index={index}
                  isSelected={selectedRouteIndex === index} 
                  onClick={() => setSelectedRouteIndex(index)} 
                />
                {/* ONLY show the detailed panel for the actively selected route */}
                {selectedRouteIndex === index && <RouteInsightsPanel />}
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start CTA (Only show when inputs are ready, routes fetched, AND showSimulateButton is enabled) */}
      {showSimulateButton && isReady && directionsResult && !isLoading && (
        <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-white/10">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => startNavigation(mapRef)}
            className="w-full py-4 bg-primary-green text-dark-900 rounded-2xl font-bold shadow-xl cursor-pointer flex justify-center items-center gap-2 hover:bg-primary-green/90 transition"
          >
            <Navigation size={20} fill="currentColor" />
            {isNavigating ? 'Navigation Active' : 'Start Simulation'}
          </motion.div>
        </div>
      )}
    </div>
  );
}
