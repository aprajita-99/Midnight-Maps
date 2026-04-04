import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MapPin, ShieldCheck, X } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';
import clsx from 'clsx';

export default function TripSummaryModal() {
  const { 
    showTripSummary, 
    setShowTripSummary, 
    submitFeedback, 
    directionsResult, 
    selectedRouteIndex,
    setDirectionsResult // <-- ADDED: Needed to clear the map from this component
  } = useNavigationStore();
  
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // If the store says don't show it, render nothing!
  if (!showTripSummary) return null;

  const handleRate = (rating: number) => {
    if (!directionsResult) return;
    
    // Grab the full path of the route they just finished
    const route = directionsResult.routes[selectedRouteIndex];
    const path = route?.legs?.[0]?.steps?.flatMap(s => s.path) || [];
    if (path.length === 0) return;
    
    // Sample points along the route to send to the AI
    const segmentIds = [];
    const sampleRate = Math.max(1, Math.ceil(path.length / 50)); 
    for (let i = 0; i < path.length - 1; i += sampleRate) { 
      const p1 = path[i];
      const p2 = path[i + sampleRate] || path[path.length - 1];
      segmentIds.push(`${p1.lat()},${p1.lng()}-${p2.lat()},${p2.lng()}`);
    }

    // Send the whole route to the AI for Credit Assignment!
    submitFeedback('route', segmentIds, rating);
    setIsSubmitted(true);
    
    // Close the modal automatically after 2.5 seconds AND clear the map
    setTimeout(() => {
      setShowTripSummary(false); // Hide Modal
      setIsSubmitted(false);     // Reset stars
      setDirectionsResult(null); // <-- Clear the map now!
    }, 2500);
  };

  // <-- ADDED: Handle closing the modal if they skip rating
  const handleClose = () => {
    setShowTripSummary(false);
    setDirectionsResult(null); // Make sure the map clears if they X out!
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/60 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-dark-900 border border-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-sm flex flex-col items-center relative overflow-hidden"
        >
          {/* Background ambient glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary-green/20 blur-[50px] rounded-full pointer-events-none" />

          {/* Close Button */}
          <button 
            onClick={handleClose} // <-- Updated to use our new handleClose function
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="w-16 h-16 bg-primary-green/20 text-primary-green rounded-full flex items-center justify-center mb-4 border border-primary-green/30">
            <ShieldCheck size={32} />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Destination Reached</h2>
          <p className="text-sm text-gray-400 mb-6 text-center">
            How safe did you feel on this route? Your feedback helps train our AI for others.
          </p>

          {isSubmitted ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-primary-green font-bold bg-primary-green/10 px-6 py-3 rounded-xl border border-primary-green/30 flex items-center gap-2"
            >
              <ShieldCheck size={20} />
              Route Feedback Saved!
            </motion.div>
          ) : (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => handleRate(star)}
                  className="transition-transform hover:scale-125 focus:outline-none p-1 cursor-pointer"
                >
                  <Star 
                    size={36} 
                    className={clsx(
                      "transition-colors duration-200",
                      hoveredStar >= star 
                        ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]" 
                        : "text-gray-700 fill-gray-800"
                    )} 
                  />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}