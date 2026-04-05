import { motion } from 'framer-motion';
import { Car, Footprints, Bike } from 'lucide-react';
import { useNavigationStore, type TravelMode } from '../../store/useNavigationStore';
import clsx from 'clsx';
import { useDirections } from '../../hooks/useDirections';
import { useEffect, useRef } from 'react';

// Inline motorcycle icon — not available in lucide-react
const MotorcycleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5.5" cy="17.5" r="3"/>
    <circle cx="18.5" cy="17.5" r="3"/>
    <path d="M9 12l2-5h5l2 5h2l1 3H2"/>
    <path d="M13 7V4"/>
    <path d="M11 7h4"/>
  </svg>
);

export default function TravelModeTabs() {
  const { travelMode, setTravelMode, setDirectionsResult, startLocation, endLocation } = useNavigationStore();
  const { fetchDirections } = useDirections();

  const handleModeChange = (mode: TravelMode) => {
    if (mode === travelMode) return;
    setTravelMode(mode);
    setDirectionsResult(null); // Clear map immediately to indicate loading
  };

  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
        initialMount.current = false;
        return;
    }
    // When travel mode changes, refetch IF we have both locations
    if (startLocation && endLocation) {
        fetchDirections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelMode]); 

  const tabs: { id: TravelMode; label: string; icon: any }[] = [
    { id: "DRIVING",     label: "Drive",   icon: Car },
    { id: "TWO_WHEELER", label: "2W",      icon: MotorcycleIcon },
    { id: "WALKING",     label: "Walk",    icon: Footprints },
    { id: "BICYCLING",   label: "Cycle",   icon: Bike },
  ];

  return (
    <div className="flex bg-white/[0.03] backdrop-blur-xl rounded-2xl p-1.5 border border-white/10 mb-2 relative shadow-inner">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = travelMode === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => handleModeChange(tab.id)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300 relative z-10",
              isActive ? "text-primary-green" : "text-slate-200 hover:text-white hover:bg-white/5"
            )}
          >
            <div className={clsx("transition-transform duration-300", isActive && "scale-110")}>
              <Icon size={16} />
            </div>
            <span className="hidden sm:inline text-[10px]">{tab.label}</span>
            {isActive && (
              <motion.div
                layoutId="activeTabBackground"
                className="absolute inset-0 bg-primary-green/20 backdrop-blur-md rounded-xl -z-10 shadow-[0_0_15px_rgba(34,197,94,0.15)] border border-primary-green/30"
                transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
