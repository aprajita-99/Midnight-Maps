import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Navigation, ArrowLeft, ArrowRight, ArrowUp,
  RotateCcw, AlertTriangle, Clock, Milestone,
} from 'lucide-react';
import type { UseNavigationReturn } from '../../hooks/useNavigationController';
import { stripHtml } from '../../utils/routePath';
import { useNavigationStore } from '../../store/useNavigationStore';

interface NavigationHUDProps {
  nav: UseNavigationReturn;
}

// Strip HTML tags from Google's instruction strings


// Map Google maneuver strings → Lucide icons
function ManeuverIcon({ maneuver }: { maneuver: string }) {
  const cls = 'w-8 h-8 text-white flex-shrink-0';
  if (maneuver.includes('left'))       return <ArrowLeft className={cls} />;
  if (maneuver.includes('right'))      return <ArrowRight className={cls} />;
  if (maneuver.includes('uturn'))      return <RotateCcw className={cls} />;
  if (maneuver.includes('roundabout')) return <RotateCcw className={cls} />;
  return <ArrowUp className={cls} />;
}

export default function NavigationHUD({ nav }: NavigationHUDProps) {
  const {
    isNavigating, steps, currentStepIndex,
    distanceToNext, remainingDuration, remainingDistance,
    isOffRoute,
  } = nav;

  const { setShowTripSummary, showTripSummary } = useNavigationStore();

  if (!isNavigating || showTripSummary) return null;

  const primaryStepIndex =
    currentStepIndex < steps.length - 1 ? currentStepIndex + 1 : currentStepIndex;
  const currentStep = steps[primaryStepIndex];
  const nextStep = steps[primaryStepIndex + 1];

  const handleEndNavigation = () => {
    setShowTripSummary(true); 
  };

  return (
    <div className="absolute inset-0 z-[100] pointer-events-none overflow-hidden">
      {/* ── Top instruction card ─────────────────────────────────────────── */}
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        exit={{ y: -80,    opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        className="pointer-events-auto absolute top-0 left-0 right-0 mx-auto max-w-md mt-6 px-6"
      >
        {/* Off-route banner */}
        <AnimatePresence>
          {isOffRoute && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/90 backdrop-blur text-gray-900 text-sm font-bold shadow-lg"
            >
              <AlertTriangle size={16} />
              You seem to be off the route
            </motion.div>
          )}
        </AnimatePresence>
        {/* Simulation indicator removed per user request */}

        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          {/* Main instruction row */}
          {currentStep && (
            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div className="w-11 h-11 rounded-full bg-primary-green flex items-center justify-center flex-shrink-0 shadow-lg">
                <ManeuverIcon maneuver={currentStep.maneuver} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-2xl font-black text-white leading-none">
                  {distanceToNext}
                </p>
                <p className="text-[13px] text-gray-300 mt-1 leading-snug line-clamp-2 italic">
                  {stripHtml(currentStep.instructions)}
                </p>
              </div>
            </div>
          )}

          {/* Next step preview */}
          {nextStep && (
            <div className="flex items-center gap-2.5 px-4 py-2 bg-white/5 border-t border-white/10">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Then</span>
              <div className="w-5 h-5 flex items-center justify-center grayscale opacity-80 scale-75">
                <ManeuverIcon maneuver={nextStep.maneuver} />
              </div>
              <span className="text-[11px] text-gray-400 truncate flex-1">
                {stripHtml(nextStep.instructions)}
              </span>
              <span className="text-[11px] text-gray-500 flex-shrink-0 font-medium">{nextStep.distance}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Bottom ETA strip ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ y: 80,  opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        exit={{ y: 80,     opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5, delay: 0.1 }}
        className="pointer-events-auto absolute bottom-0 left-0 right-0"
      >
        <div className="bg-dark-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary-green" />
              <span className="text-white font-bold text-lg">{remainingDuration}</span>
            </div>
            <div className="flex items-center gap-2">
              <Milestone size={16} className="text-gray-400" />
              <span className="text-gray-300 text-sm">{remainingDistance}</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <Navigation size={12} className="text-primary-green" />
            Step {Math.min(primaryStepIndex + 1, steps.length)} of {steps.length}
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleEndNavigation}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500/90 hover:bg-red-500 text-white text-sm font-bold shadow-lg transition-colors"
          >
            <X size={15} strokeWidth={2.5} />
            End
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
