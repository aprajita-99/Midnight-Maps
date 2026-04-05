import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lightbulb, Video, Activity, TreePine, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { useNavigationStore } from '../../store/useNavigationStore';

interface ToggleButtonProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  activeClasses: string;
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
  activeClasses,
}: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all',
        active
          ? activeClasses
          : 'bg-dark-800/50 border-white/5 text-gray-400 hover:bg-dark-700'
      )}
    >
      {icon}
      <span className="text-[9px] uppercase font-bold tracking-wider">{label}</span>
    </button>
  );
}

export default function RouteInsightsPanel() {
  const {
    routeAnalysis,
    selectedRouteIndex,
    showCameras,
    setShowCameras,
    showLamps,
    setShowLamps,
    showPolice,
    setShowPolice,
  } = useNavigationStore();

  const analysis = routeAnalysis?.[selectedRouteIndex];
  if (!analysis) return null;

  const features = analysis.features || {
    lighting: 0,
    camera: 0,
    activity: 0,
    environment: 0,
  };
  const safetyScore = Math.round((analysis.meanSafety ?? 0) * 100);
  const riskScore = Math.round((analysis.risk ?? 0) * 100);

  const renderProgressBar = (label: string, icon: ReactNode, value: number) => {
    const percentage = Math.round(value * 100);
    let color = 'bg-red-500';

    if (percentage > 40) color = 'bg-yellow-500';
    if (percentage > 70) color = 'bg-green-500';

    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            {icon}
            {label}
          </div>
          <span className="text-white">{percentage}%</span>
        </div>
        <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            className={clsx('h-full rounded-full', color)}
          />
        </div>
      </div>
    );
  };

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

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-primary-green/20 bg-primary-green/10 px-4 py-3">
          <div className="text-[10px] text-primary-green font-bold uppercase tracking-widest">
            Safety Score
          </div>
          <div className="text-2xl font-black text-white mt-1">{safetyScore}%</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Risk Exposure
          </div>
          <div className="text-2xl font-black text-white mt-1">{riskScore}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {renderProgressBar('Lighting', <Lightbulb size={12} />, features.lighting)}
        {renderProgressBar('Surveillance', <Video size={12} />, features.camera)}
        {renderProgressBar('Activity', <Activity size={12} />, features.activity)}
        {renderProgressBar('Context', <TreePine size={12} />, features.environment)}
      </div>

      <div className="flex gap-2 pt-2 border-t border-white/10">
        <ToggleButton
          active={showLamps}
          onClick={() => setShowLamps(!showLamps)}
          icon={<Lightbulb size={16} />}
          label="Streetlamps"
          activeClasses="bg-yellow-500/20 border-yellow-500 text-yellow-400"
        />
        <ToggleButton
          active={showCameras}
          onClick={() => setShowCameras(!showCameras)}
          icon={<Video size={16} />}
          label="Cameras"
          activeClasses="bg-blue-500/20 border-blue-500 text-blue-400"
        />
        <ToggleButton
          active={showPolice}
          onClick={() => setShowPolice(!showPolice)}
          icon={<MapPin size={16} />}
          label="Police"
          activeClasses="bg-red-500/20 border-red-500 text-red-400"
        />
      </div>
    </motion.div>
  );
}
