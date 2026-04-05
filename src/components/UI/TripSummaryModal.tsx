import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldCheck, Star, X } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';
import clsx from 'clsx';
import type { UseNavigationReturn } from '../../hooks/useNavigationController';
import { stripHtml } from '../../utils/routePath';

interface TripSummaryModalProps {
  nav: UseNavigationReturn;
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export default function TripSummaryModal({ nav }: TripSummaryModalProps) {
  const {
    showTripSummary,
    setShowTripSummary,
    submitRouteChunkFeedback,
    routeAnalysis,
    selectedRouteIndex,
    setDirectionsResult,
    isDemoNightMode,
  } = useNavigationStore();

  const [selectedSafestChunkId, setSelectedSafestChunkId] = useState<string | null>(null);
  const [selectedUnsafeChunkId, setSelectedUnsafeChunkId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const analysis = routeAnalysis?.[selectedRouteIndex] ?? null;

  // Same scoring formula as RouteInsightsPanel
  const safetyScore = useMemo(() => {
    if (!analysis) return null;
    const features = analysis.features || { lighting: 0, camera: 0, activity: 0, environment: 0 };
    const NIGHT_W = { LIGHTING: 0.40, ACTIVITY: 0.25, ENVIRONMENT: 0.20, CAMERA: 0.15 };
    const DAY_W   = { LIGHTING: 0.50, ACTIVITY: 0.10, ENVIRONMENT: 0.30, CAMERA: 0.10 };
    const hour = new Date().getHours();
    const slot = isDemoNightMode ? 0 : Math.floor(hour / 2);
    const isDay = !isDemoNightMode && hour >= 6 && hour < 18;
    const finalLighting = isDay ? 1.0 : features.lighting;
    const finalCamera   = Math.min(1.0, features.camera * 1.35);
    const W = isDay ? DAY_W : NIGHT_W;
    let base = (finalLighting * W.LIGHTING) + (features.activity * W.ACTIVITY) +
               (features.environment * W.ENVIRONMENT) + (finalCamera * W.CAMERA);
    if (finalLighting < 0.3 && features.activity < 0.3) base *= 0.70;
    else if (finalLighting < 0.3) base *= 0.85;
    if ((slot === 0 || slot === 1) && base > 0.90) base = 0.90;
    return Math.round(Math.min(0.98, Math.max(0.05, 0.35 + base * 0.65)) * 100);
  }, [analysis, isDemoNightMode]);
  
  const feedbackChunks = useMemo(() => {
    const rawChunks = analysis?.feedbackChunks?.filter((chunk) => chunk.segmentIds.length > 0) ?? [];
    const steps = nav.steps || [];
    
    if (steps.length === 0 || rawChunks.length === 0) return rawChunks;

    // Calculate step boundaries based on cumulative distance
    let stepAcc = 0;
    const stepBoundaries = steps.map(s => {
      const start = stepAcc;
      stepAcc += s.distanceValue;
      return { start, end: stepAcc, text: stripHtml(s.instructions) };
    });

    let chunkAcc = 0;
    return rawChunks.map((chunk, idx) => {
      const startDist = chunkAcc;
      chunkAcc += chunk.distance;
      const midDist = startDist + chunk.distance / 2;

      // Map chunk midpoint to a turn step
      const stepIdx = stepBoundaries.findIndex(b => midDist >= b.start && midDist <= b.end);
      let newLabel = chunk.label;

      if (idx === 0) {
        newLabel = "Near start of trip";
      } else if (idx === rawChunks.length - 1) {
        newLabel = "Near destination";
      } else if (stepIdx !== -1) {
        const nextStep = stepBoundaries[stepIdx + 1];
        if (nextStep) {
          // Format: "Before [Instructions]"
          const instruction = nextStep.text;
          const cleaned = instruction
            .replace(/^Turn (left|right)/i, (m) => m.replace("Turn", "turning"))
            .replace(/^Head/i, "heading")
            .replace(/^Continue/i, "continuing");
          
          newLabel = `Before ${cleaned}`;
        } else {
          newLabel = `Along ${stepBoundaries[stepIdx].text}`;
        }
      }

      return { ...chunk, label: newLabel };
    });
  }, [analysis, nav.steps]);

  if (!showTripSummary) return null;

  const resetAndClose = () => {
    setShowTripSummary(false);
    setDirectionsResult(null);
    setSelectedSafestChunkId(null);
    setSelectedUnsafeChunkId(null);
    setIsSubmitting(false);
    setIsSubmitted(false);
    setSubmitError(null);
    nav.stopNavigation();
  };

  const handleSubmit = async () => {
    if (
      isSubmitting ||
      !selectedSafestChunkId ||
      !selectedUnsafeChunkId ||
      selectedSafestChunkId === selectedUnsafeChunkId
    ) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    const success = await submitRouteChunkFeedback({
      chunks: feedbackChunks,
      safestChunkId: selectedSafestChunkId,
      unsafeChunkId: selectedUnsafeChunkId,
    });
    setIsSubmitting(false);

    if (!success) {
      setSubmitError('Could not save route feedback right now. Please try again.');
      return;
    }

    setIsSubmitted(true);
    setTimeout(() => {
      resetAndClose();
    }, 2500);
  };

  const handlePickSafest = (chunkId: string) => {
    setSubmitError(null);
    setSelectedSafestChunkId(chunkId);
    if (selectedUnsafeChunkId === chunkId) {
      setSelectedUnsafeChunkId(null);
    }
  };

  const handlePickUnsafe = (chunkId: string) => {
    setSubmitError(null);
    setSelectedUnsafeChunkId(chunkId);
    if (selectedSafestChunkId === chunkId) {
      setSelectedSafestChunkId(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md rounded-2xl overflow-hidden">
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          className="bg-dark-900 border border-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90%] relative overflow-hidden flex flex-col pointer-events-auto"
        >
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary-green/15 blur-[70px] rounded-full pointer-events-none" />

          <button
            onClick={resetAndClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          >
            <X size={20} />
          </button>

          <div className="flex items-start gap-4 mb-5">
            <div className="w-16 h-16 bg-primary-green/20 text-primary-green rounded-full flex items-center justify-center border border-primary-green/30 shrink-0">
              <ShieldCheck size={30} />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-white">Route Feedback</h2>
              <p className="text-sm text-gray-400 mt-1">
                Mark the safest part and the part that felt least safe.
              </p>
              {safetyScore !== null && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest font-bold text-gray-300">
                  <Star size={12} className="text-primary-green" />
                  Safety Score {safetyScore}%
                </div>
              )}
            </div>
          </div>

          {isSubmitted ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-primary-green font-bold bg-primary-green/10 px-6 py-4 rounded-2xl border border-primary-green/30 flex items-center gap-3 justify-center"
            >
              <ShieldCheck size={22} />
              Feedback saved for learning.
            </motion.div>
          ) : feedbackChunks.length === 0 ? (
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-4 text-sm text-yellow-100 flex items-start gap-3">
              <AlertTriangle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
              Chunk feedback is not available for this route yet.
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-5">
              <div className="min-h-0 overflow-y-auto pr-1">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary-green mb-3">
                    Safest Part
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {feedbackChunks.map((chunk) => (
                      <button
                        key={`safe-${chunk.id}`}
                        onClick={() => handlePickSafest(chunk.id)}
                        className={clsx(
                          'text-left rounded-2xl border px-4 py-3 transition-all',
                          selectedSafestChunkId === chunk.id
                            ? 'bg-primary-green/15 border-primary-green text-white'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/10'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-bold">{chunk.label}</span>
                          <span className="text-xs text-gray-400">{formatDistance(chunk.distance)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-red-500 mb-3">
                    Least Safe Part
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {feedbackChunks.map((chunk) => (
                      <button
                        key={`unsafe-${chunk.id}`}
                        onClick={() => handlePickUnsafe(chunk.id)}
                        className={clsx(
                          'text-left rounded-2xl border px-4 py-3 transition-all',
                          selectedUnsafeChunkId === chunk.id
                            ? 'bg-red-500/15 border-red-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/10'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-bold">{chunk.label}</span>
                          <span className="text-xs text-gray-400">{formatDistance(chunk.distance)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 mt-auto">
                {submitError && (
                  <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {submitError}
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    !selectedSafestChunkId ||
                    !selectedUnsafeChunkId ||
                    selectedSafestChunkId === selectedUnsafeChunkId
                  }
                  className={clsx(
                    'w-full py-3 rounded-2xl font-bold transition-colors',
                    isSubmitting ||
                    !selectedSafestChunkId ||
                    !selectedUnsafeChunkId ||
                    selectedSafestChunkId === selectedUnsafeChunkId
                      ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                      : 'bg-primary-green text-dark-900 hover:bg-primary-green/90'
                  )}
                >
                  {isSubmitting ? 'Saving Feedback...' : 'Save Route Feedback'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
