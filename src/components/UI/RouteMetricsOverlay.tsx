import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, Navigation, AlertTriangle } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';

export default function RouteMetricsOverlay() {
  const { 
    routeAnalysis, 
    selectedRouteIndex, 
    shortestRouteIndex, 
    safestRouteIndex, 
    balancedRouteIndex,
    directionsResult
  } = useNavigationStore();

  if (!routeAnalysis || !directionsResult) return null;

  const currentRoute = routeAnalysis[selectedRouteIndex];
  if (!currentRoute) return null;

  const getSafetyColor = (score: number) => {
    if (score > 0.7) return 'text-primary-green';
    if (score > 0.4) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskLevel = (score: number) => {
    if (score > 0.7) return { text: 'Safe', icon: Shield, color: 'text-primary-green' };
    if (score > 0.4) return { text: 'Moderate', icon: AlertTriangle, color: 'text-yellow-400' };
    return { text: 'Risky', icon: AlertTriangle, color: 'text-red-400' };
  };

  const risk = getRiskLevel(currentRoute.meanSafety);
  const durationMin = Math.round(currentRoute.duration / 60);
  const distanceKm = (currentRoute.distance / 1000).toFixed(1);

  const labels = [];
  if (selectedRouteIndex === shortestRouteIndex) labels.push({ text: 'Shortest', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' });
  if (selectedRouteIndex === safestRouteIndex)   labels.push({ text: 'Safest', color: 'bg-green-500/20 text-green-400 border-green-500/30' });
  if (selectedRouteIndex === balancedRouteIndex) labels.push({ text: 'Balanced', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-28 left-6 right-6 md:left-auto md:right-6 md:w-80 z-20"
      >
        <div className="bg-dark-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {/* Header with Labels */}
          <div className="flex items-center gap-2 mb-4 h-6">
            {labels.map((label, i) => (
              <span key={i} className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${label.color}`}>
                {label.text}
              </span>
            ))}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Shield size={14} />
                <span className="text-[10px] uppercase font-medium">Safety</span>
              </div>
              <span className={`text-lg font-bold ${getSafetyColor(currentRoute.meanSafety)}`}>
                {Math.round(currentRoute.meanSafety * 100)}%
              </span>
            </div>
            <div className="flex flex-col gap-1 border-x border-white/5 px-4 whitespace-nowrap">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Clock size={14} />
                <span className="text-[10px] uppercase font-medium">Time</span>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                {durationMin}m
              </span>
            </div>
            <div className="flex flex-col gap-1 pl-2 whitespace-nowrap">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Navigation size={14} />
                <span className="text-[10px] uppercase font-medium">Dist</span>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                {distanceKm}km
              </span>
            </div>
          </div>

          {/* Risk Level Indicator */}
          <div className={`flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-white/5 ${risk.color}`}>
                <risk.icon size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase font-medium leading-none mb-1">Risk Level</span>
                <span className={`text-sm font-bold ${risk.color}`}>{risk.text}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
