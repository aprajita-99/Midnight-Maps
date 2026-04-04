import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lightbulb, Video, Activity, TreePine, MapPin, Play, Square } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';
import clsx from 'clsx';

export default function RouteDetailsPanel() {
  const { 
    routeAnalysis, 
    selectedRouteIndex,
    directionsResult,
    showCameras, setShowCameras,
    showLamps, setShowLamps,
    showPolice, setShowPolice
  } = useNavigationStore();

  const [isSimulating, setIsSimulating] = useState(false);
  const animRef = useRef<number | null>(null);


  const startSimulation = () => {
    if (!directionsResult) return;

    const route = directionsResult.routes[selectedRouteIndex];
    if (!route?.legs?.[0]) return;

    const path = route.legs[0].steps?.flatMap(s => s.path) || [];
    if (path.length === 0) return;

    let idx = 0;
    let p = 0;

    const speed = 4; // m/s

    const loop = () => {
      if (idx >= path.length - 1) {
        stopSimulation();
        return;
      }

      const p1 = path[idx];
      const p2 = path[idx + 1];

      const lat = p1.lat() + (p2.lat() - p1.lat()) * p;
      const lng = p1.lng() + (p2.lng() - p1.lng()) * p;

      // 🔥 PUSH POSITION INTO YOUR NAVIGATION SYSTEM
      window.dispatchEvent(new CustomEvent("SIMULATED_GPS", {
        detail: { lat, lng }
      }));

      p += 0.02;

      if (p >= 1) {
        p = 0;
        idx++;
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    setIsSimulating(true);
  };

  const stopSimulation = () => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setIsSimulating(false);
  };

  const toggleSimulation = () => {
    if (isSimulating) stopSimulation();
    else startSimulation();
  };

  const analysis = routeAnalysis?.[selectedRouteIndex];
   useEffect(() => {
    return () => stopSimulation();
  }, []);

  useEffect(() => {
    stopSimulation();
  }, [directionsResult]);
  if (!analysis) return null;

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
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">
          Route Intelligence
        </h3>
      </div>

      {/* Safety Metrics */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {renderProgressBar("Lighting", <Lightbulb size={12}/>, features.lighting)}
        {renderProgressBar("Surveillance", <Video size={12}/>, features.camera)}
        {renderProgressBar("Activity", <Activity size={12}/>, features.activity)}
        {renderProgressBar("Context", <TreePine size={12}/>, features.environment)}
      </div>

      {/* Map Toggles */}
      <div className="flex gap-2 pt-2 border-t border-white/10">
        <ToggleBtn active={showLamps} onClick={() => setShowLamps(!showLamps)} icon={<Lightbulb size={16}/>} label="Streetlamps" colorClass="yellow" />
        <ToggleBtn active={showCameras} onClick={() => setShowCameras(!showCameras)} icon={<Video size={16}/>} label="Cameras" colorClass="blue" />
        <ToggleBtn active={showPolice} onClick={() => setShowPolice(!showPolice)} icon={<MapPin size={16}/>} label="Police" colorClass="red" />
      </div>

      {/* 🔥 Simulation Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={toggleSimulation}
        className={clsx(
          "w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all",
          isSimulating
            ? "bg-red-500/20 text-red-400 border border-red-500/40"
            : "bg-green-500/20 text-green-400 border border-green-500/40"
        )}
      >
        {isSimulating ? <Square size={16}/> : <Play size={16}/>}
        {isSimulating ? "Stop Simulation" : "Simulate Route"}
      </motion.button>
    </motion.div>
  );
}