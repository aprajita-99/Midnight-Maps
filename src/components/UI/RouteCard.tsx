import clsx from 'clsx';
import { motion } from 'framer-motion';
import { Shield, Clock, Navigation } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';

// Mirrors the safety score formula used in RouteInsightsPanel
function calcSafetyScore(analysis: { meanSafety: number; features?: { lighting: number; camera: number; activity: number; environment: number } }, isDemoNightMode: boolean): number {
  const features = analysis.features || { lighting: 0, camera: 0, activity: 0, environment: 0 };
  const NIGHT_WEIGHTS = { LIGHTING: 0.40, ACTIVITY: 0.25, ENVIRONMENT: 0.20, CAMERA: 0.15 };
  const DAY_WEIGHTS   = { LIGHTING: 0.50, ACTIVITY: 0.10, ENVIRONMENT: 0.30, CAMERA: 0.10 };
  const currentHour = new Date().getHours();
  const timeSlot = isDemoNightMode ? 0 : Math.floor(currentHour / 2);
  const isDaytime = !isDemoNightMode && (currentHour >= 6 && currentHour < 18);
  const finalLighting = isDaytime ? 1.0 : features.lighting;
  const finalCamera   = Math.min(1.0, features.camera * 1.35);
  const activeWeights = isDaytime ? DAY_WEIGHTS : NIGHT_WEIGHTS;
  let base = (finalLighting * activeWeights.LIGHTING) +
             (features.activity * activeWeights.ACTIVITY) +
             (features.environment * activeWeights.ENVIRONMENT) +
             (finalCamera * activeWeights.CAMERA);
  if (finalLighting < 0.3 && features.activity < 0.3) base *= 0.70;
  else if (finalLighting < 0.3) base *= 0.85;
  if ((timeSlot === 0 || timeSlot === 1) && base > 0.90) base = 0.90;
  const finalSafety = Math.min(0.98, Math.max(0.05, 0.35 + base * 0.65));
  return Math.round(finalSafety * 100);
}

interface RouteCardProps {
  route: google.maps.DirectionsRoute;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export default function RouteCard({ route, index, isSelected, onClick }: RouteCardProps) {
  const { routeAnalysis, shortestRouteIndex, safestRouteIndex, balancedRouteIndex, isDemoNightMode } = useNavigationStore();

  const leg = route.legs[0];
  if (!leg) return null;

  const analysis = routeAnalysis?.[index];

  const isShortest = index === shortestRouteIndex;
  const isSafest = index === safestRouteIndex;
  const isBalanced = index === balancedRouteIndex;

  // CHANGED: Now returns an array of all applicable labels instead of just the first one
  const getLabels = () => {
    const labels = [];
    if (isSafest) labels.push({ text: 'Safest', color: 'bg-green-500/20 text-green-400 border-green-500/30' });
    if (isBalanced) labels.push({ text: 'Balanced', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' });
    if (isShortest) labels.push({ text: 'Shortest', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' });
    return labels;
  };

  const labels = getLabels();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={clsx(
        "p-5 rounded-3xl border cursor-pointer transition-all relative overflow-hidden backdrop-blur-xl",
        isSelected
          ? "bg-white/5 border-primary-green ring-1 ring-primary-green/30"
          : "bg-dark-800/40 border-white/5 hover:border-white/20 hover:bg-dark-700/60"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={clsx("font-bold text-xl tracking-tight", isSelected ? "text-primary-green" : "text-white")}>
              Route {index + 1}
            </h3>
            {/* CHANGED: Map over the array to render multiple badges */}
            <div className="flex flex-wrap gap-1 mt-0.5">
              {labels.map((label, i) => (
                <span key={i} className={clsx("text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border", label.color)}>
                  {label.text}
                </span>
              ))}
            </div>
          </div>
          <span className="text-xs text-gray-400 truncate max-w-[200px] mt-1">via {route.summary}</span>
        </div>

        <div className="flex flex-col items-end shrink-0 ml-2">
          <span className={clsx("text-xl font-black tracking-tighter", isSelected ? "text-primary-green" : "text-white")}>
            {leg.duration?.text || "ETA --"}
          </span>
          {analysis && (
            <div className="flex items-center gap-1 mt-1">
              <Shield size={12} className="text-primary-green" />
              <span className="text-[10px] font-bold text-primary-green uppercase tracking-tighter">
                {calcSafetyScore(analysis, isDemoNightMode)}% Safe
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 border-t border-white/5 pt-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Navigation size={14} className="text-gray-500" />
          <span>{leg.distance?.text}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock size={14} className="text-gray-500" />
          <span>{leg.duration?.text}</span>
        </div>
      </div>

      {isSelected && (
        <motion.div
          layoutId="active-glow"
          className="absolute -right-4 -bottom-4 w-12 h-12 bg-primary-green/20 blur-2xl rounded-full"
        />
      )}
    </motion.div>
  );
}
