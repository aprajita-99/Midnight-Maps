import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Loader2, Shield, Activity, Sun, Camera } from 'lucide-react';
import type { UseStreetViewReturn } from '../../hooks/useStreetView';

interface StreetViewPanelProps {
  svStatus: UseStreetViewReturn['svStatus'];
  svLocation: UseStreetViewReturn['svLocation'];
  panoramaRef: UseStreetViewReturn['panoramaRef'];
  mapRef: React.RefObject<google.maps.Map | null>;
  onClose: () => void;
}

export default function StreetViewPanel({
  svStatus,
  svLocation,
  panoramaRef,
  mapRef,
  onClose,
}: StreetViewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentSegment, setCurrentSegment] = useState<any>(null);
  const [hudStatus, setHudStatus] = useState<'loading' | 'ready' | 'no_data'>('loading');

  // Calculates which of the 12 time slots corresponds to the user's current local time
  const getCurrentTimeSlot = () => {
    const currentHour = new Date().getHours(); // Gets local hour (0-23)
    return Math.floor(currentHour / 2); // Maps to index 0-11
  };

  const updateHUD = useCallback(async (lat: number, lng: number) => {
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${baseURL}/api/segments/nearby?lat=${lat}&lng=${lng}&radius=30`);
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        // Find closest segment from the results
        const closest = data.sort((a: any, b: any) => {
          const distA = Math.hypot(a.midpoint.lat - lat, a.midpoint.lng - lng);
          const distB = Math.hypot(b.midpoint.lat - lat, b.midpoint.lng - lng);
          return distA - distB;
        })[0];
        setCurrentSegment(closest);
        setHudStatus('ready');
      } else {
        setCurrentSegment(null);
        setHudStatus('no_data');
      }
    } catch (err) {
      console.error('HUD fetch error:', err);
      setHudStatus('no_data');
    }
  }, []);






  // Initialize StreetViewPanorama once the container div mounts and we have a location
  useEffect(() => {
    if (svStatus !== 'open' || !svLocation || !containerRef.current) return;
    if (!window.google?.maps?.StreetViewPanorama) return;

    const panorama = new window.google.maps.StreetViewPanorama(containerRef.current, {
      position: { lat: svLocation.lat, lng: svLocation.lng },
      pov: { heading: 0, pitch: 0 },
      zoom: 1,
      addressControl: false,
      fullscreenControl: false,
      motionTracking: false,
      motionTrackingControl: false,
    });

    if (mapRef.current) {
      mapRef.current.setStreetView(panorama);
    }

    panoramaRef.current = panorama;



    // Listen for movement in Street View
    const posListener = panorama.addListener('position_changed', () => {
      const pos = panorama.getPosition();
      if (pos) {
        updateHUD(pos.lat(), pos.lng());
      }
    });

    // Initial HUD update
    updateHUD(svLocation.lat, svLocation.lng);

    return () => {
      window.google.maps.event.removeListener(posListener);
    };
  }, [svStatus, svLocation, mapRef, panoramaRef, updateHUD]);

  return (
    <>
      {/* Loading / unavailable toast — portal ensures it's above Google Maps layers */}
      {(svStatus === 'unavailable' || svStatus === 'loading') &&
        createPortal(
          <div className="fixed bottom-44 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1a1a2e]/90 backdrop-blur-xl border border-white/10 shadow-2xl">
            {svStatus === 'loading' ? (
              <>
                <Loader2 size={16} className="text-green-400 animate-spin flex-shrink-0" />
                <span className="text-sm text-gray-300">Checking Street View coverage…</span>
              </>
            ) : (
              <>
                <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />
                <span className="text-sm text-gray-300">No Street View coverage here</span>
              </>
            )}
          </div>,
          document.body
        )}

      {/* Street View panorama fills the map area */}
      <AnimatePresence>
        {svStatus === 'open' && (
          <motion.div
            key="sv-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-40"
          >
            <div ref={containerRef} className="w-full h-full" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit button + badge — portal at body level, guaranteed above Google's panorama stacking context */}
      {svStatus === 'open' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Exit button */}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              onClick={onClose}
              className="pointer-events-auto absolute top-6 right-6 flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900/90 backdrop-blur-xl border border-white/20 shadow-2xl text-white text-sm font-semibold hover:bg-white hover:text-gray-900 active:scale-95 transition-all duration-200"
            >
              <X size={15} strokeWidth={2.5} />
              Exit Street View
            </motion.button>



            {/* Street View badge */}
            <div className="pointer-events-none absolute top-6 left-6 px-3 py-1.5 rounded-full bg-[#4285F4] text-white text-xs font-bold tracking-widest shadow-lg uppercase">
              Street View
            </div>

            {/* Safety HUD */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="pointer-events-auto absolute bottom-6 left-6 w-64 p-4 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 shadow-2xl text-white"
              id="safety-hud"
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-blue-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Safety HUD</h3>
              </div>

              {hudStatus === 'loading' ? (
                <div className="flex items-center gap-2 py-4 text-gray-400 italic">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs">Analyzing proximity...</span>
                </div>
              ) : hudStatus === 'no_data' ? (
                <div className="py-4 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>No safety data available</span>
                </div>
              ) : currentSegment && (
                <div className="space-y-3">
                  <HUDItem
                    icon={<Sun size={14} />}
                    label="Lighting"
                    // Safely grabs the current 2-hour block, defaulting to 0 if the array is missing
                    value={(currentSegment.features.lighting?.[getCurrentTimeSlot()] ?? 0).toFixed(2)}
                    color="text-yellow-400"
                  />
                  <HUDItem
                    icon={<Activity size={14} />}
                    label="Activity"
                    value={currentSegment.features.activity_score.toFixed(2)}
                    color="text-green-400"
                  />
                  <HUDItem
                    icon={<Shield size={14} />}
                    label="Environment"
                    value={currentSegment.features.environment.toFixed(2)}
                    color="text-blue-400"
                  />
                  <HUDItem
                    icon={<Camera size={14} />}
                    label="Camera"
                    value={currentSegment.features.camera.toFixed(2)}
                    color="text-purple-400"
                  />
                </div>
              )}
            </motion.div>
          </div>,
          document.body
        )}
    </>
  );
}

function HUDItem({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-2 text-gray-300">
        <span className={color}>{icon}</span>
        <span className="text-[11px] font-medium uppercase">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${parseFloat(value) * 100}%` }}
            className={`h-full bg-current ${color}`}
          />
        </div>
        <span className="text-xs font-mono font-bold w-8 text-right">{value}</span>
      </div>
    </div>
  );
}


