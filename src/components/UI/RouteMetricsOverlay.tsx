// @ts-nocheck
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
   <></>
  );
}
