import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Navigation, ArrowLeft, ArrowRight, ArrowUp,
  RotateCcw, AlertTriangle, Clock, Milestone,
} from 'lucide-react';
import type { UseNavigationReturn } from '../../hooks/useNavigation';

interface NavigationHUDProps {
  nav: UseNavigationReturn;
}

// Strip HTML tags from Google's instruction strings
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

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
    isOffRoute, stopNavigation,
  } = nav;

  if (!isNavigating) return null;

  const currentStep = steps[currentStepIndex];
  const nextStep    = steps[currentStepIndex + 1];

  return createPortal(
    <div className="fixed inset-0 z-[8000] pointer-events-none">

      {/* ── Top instruction card ─────────────────────────────────────────── */}
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        exit={{ y: -80,    opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        className="pointer-events-auto absolute top-0 left-0 right-0 mx-auto max-w-lg mt-4 px-4"
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

        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          {/* Main instruction row */}
          {currentStep && (
            <div className="flex items-center gap-4 px-5 py-4">
              {/* Maneuver icon in green circle */}
              <div className="w-14 h-14 rounded-full bg-primary-green flex items-center justify-center flex-shrink-0 shadow-lg">
                <ManeuverIcon maneuver={currentStep.maneuver} />
              </div>

              <div className="flex-1 min-w-0">
                {/* Distance to maneuver */}
                <p className="text-3xl font-black text-white leading-none">
                  {distanceToNext}
                </p>
                {/* Instruction text */}
                <p className="text-sm text-gray-300 mt-1 leading-snug line-clamp-2">
                  {stripHtml(currentStep.instructions)}
                </p>
              </div>
            </div>
          )}

          {/* Next step preview */}
          {nextStep && (
            <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 border-t border-white/10">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Then</span>
              <ManeuverIcon maneuver={nextStep.maneuver} />
              <span className="text-xs text-gray-300 truncate flex-1">
                {stripHtml(nextStep.instructions)}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">{nextStep.distance}</span>
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
        <div className="bg-gray-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl px-6 py-4 flex items-center justify-between gap-4">
          {/* ETA chips */}
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

          {/* Step progress */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <Navigation size={12} className="text-primary-green" />
            Step {currentStepIndex + 1} of {steps.length}
          </div>

          {/* End navigation */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={stopNavigation}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500/90 hover:bg-red-500 text-white text-sm font-bold shadow-lg transition-colors"
          >
            <X size={15} strokeWidth={2.5} />
            End
          </motion.button>
        </div>
      </motion.div>

    </div>,
    document.body
  );
}
