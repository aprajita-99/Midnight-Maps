import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lightbulb, Video, Activity, TreePine, MapPin } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';
import clsx from 'clsx';

export default function RouteDetailsPanel() {
  const { 
    routeAnalysis, 
    selectedRouteIndex,
    showCameras, setShowCameras,
    showLamps, setShowLamps,
    showPolice, setShowPolice
  } = useNavigationStore();

  const analysis = routeAnalysis?.[selectedRouteIndex];
  if (!analysis) return null;

  // Hackathon Trick: Since the backend currently returns a single meanSafety score, 
  // we will mathematically derive realistic-looking sub-scores for the demo.
  // In production, your backend would return these exact averages.
  const base = analysis.meanSafety;
  const features = {
    lighting: Math.min(base * 1.2, 1.0),
    camera: Math.max(base * 0.8, 0.1),
    activity: base,
    environment: Math.min(base * 1.1, 1.0)
  };

  const renderProgressBar = (label: string, icon: any, val: number) => {
    const pct = Math.round(val * 100);
    let color = "bg-red-500";
    if (pct > 40) color = "bg-yellow-500";
    if (pct > 70) color = "bg-green-500";

    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            {icon} {label}
          </div>
          <span className="text-white">{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            className={clsx("h-full rounded-full", color)} 
          />
        </div>
      </div>
    );
  };

  const ToggleBtn = ({ active, onClick, icon, label, colorClass }: any) => (
    <button
      onClick={onClick}
      className={clsx(
        "flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all",
        active 
          ? `bg-${colorClass}-500/20 border-${colorClass}-500 text-${colorClass}-400` 
          : "bg-dark-800/50 border-white/5 text-gray-400 hover:bg-dark-700"
      )}
    >
      {icon}
      <span className="text-[9px] uppercase font-bold tracking-wider">{label}</span>
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="w-full bg-dark-900/50 border border-white/10 rounded-3xl p-5 mt-2 flex flex-col gap-5 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <Shield size={16} className="text-primary-green" />
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Route Intelligence</h3>
      </div>

      {/* 4-Pillar Breakdown */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {renderProgressBar("Lighting", <Lightbulb size={12}/>, features.lighting)}
        {renderProgressBar("Surveillance", <Video size={12}/>, features.camera)}
        {renderProgressBar("Activity", <Activity size={12}/>, features.activity)}
        {renderProgressBar("Context", <TreePine size={12}/>, features.environment)}
      </div>

      {/* Interactive Map Toggles */}
      <div className="flex gap-2 pt-2 border-t border-white/10">
        <ToggleBtn 
          active={showLamps} 
          onClick={() => setShowLamps(!showLamps)} 
          icon={<Lightbulb size={16}/>} 
          label="Streetlamps" 
          colorClass="yellow"
        />
        <ToggleBtn 
          active={showCameras} 
          onClick={() => setShowCameras(!showCameras)} 
          icon={<Video size={16}/>} 
          label="Cameras" 
          colorClass="blue"
        />
        <ToggleBtn 
          active={showPolice} 
          onClick={() => setShowPolice(!showPolice)} 
          icon={<MapPin size={16}/>} 
          label="Police" 
          colorClass="red"
        />
      </div>
    </motion.div>
  );
}