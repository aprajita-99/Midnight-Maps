import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LocateFixed, LocateOff, Loader2 } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';
import type { UserLocation, LocationError } from '../../hooks/useUserLocation';

interface LocationControlProps {
  userLocation: UserLocation | null;
  isLocationEnabled: boolean;
  isLocating: boolean;
  locationError: LocationError;
  toggleLocation: () => void;
  onUseAsStart?: () => void;
}

export default function LocationControl({
  userLocation,
  isLocationEnabled,
  isLocating,
  locationError,
  toggleLocation,
  onUseAsStart,
}: LocationControlProps) {
  const setStartLocation = useNavigationStore((s) => s.setStartLocation);

  // Local visibility flag so we can auto-dismiss the toast after 4 s
  const [errorVisible, setErrorVisible] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cancel any pending auto-dismiss
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    if (locationError) {
      setErrorVisible(true);
      // Auto-dismiss after 4 seconds
      dismissTimerRef.current = setTimeout(() => setErrorVisible(false), 4000);
    } else {
      setErrorVisible(false);
    }

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [locationError]);

  const handleUseAsStart = () => {
    if (!userLocation) return;
    setStartLocation({
      address: 'My Current Location',
      lat: userLocation.lat,
      lng: userLocation.lng,
    });
    onUseAsStart?.();
  };

  const errorMessages: Record<string, string> = {
    PERMISSION_DENIED: 'Location access denied. Allow it in browser settings.',
    POSITION_UNAVAILABLE: 'Unable to detect your location.',
    TIMEOUT: 'Location request timed out. Try again.',
    UNSUPPORTED: 'Geolocation not supported by your browser.',
  };

  return (
    <div className="relative">
      {/* Error toast — floats to the left of the button, auto-dismisses in 4 s */}
      <AnimatePresence>
        {locationError && errorVisible && (
          <motion.div
            key="error"
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            className="absolute right-[calc(100%+10px)] top-0 w-48 bg-red-900/85 backdrop-blur-xl text-red-200 text-[11px] leading-snug px-3 py-2.5 rounded-xl border border-red-500/30 shadow-xl break-words"
          >
            {errorMessages[locationError] ?? 'An error occurred.'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Use as Start" badge — floats to the left of the button */}
      <AnimatePresence>
        {isLocationEnabled && userLocation && (
          <motion.button
            key="use-start"
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            onClick={handleUseAsStart}
            className="absolute right-[calc(100%+10px)] top-1 bg-dark-800/80 backdrop-blur-xl text-white text-xs font-semibold px-3 py-2 rounded-xl border border-[#4285F4]/40 shadow-xl hover:bg-[#4285F4]/20 hover:border-[#4285F4]/60 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-[#4285F4] shadow-[0_0_6px_2px_rgba(66,133,244,0.6)]" />
            Use as Start
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main location button */}
      <div className="relative group">
        <motion.button
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.93 }}
          onClick={toggleLocation}
          aria-label={isLocationEnabled ? 'Disable my location' : 'Show my location'}
          className="w-12 h-12 flex items-center justify-center rounded-2xl border shadow-lg backdrop-blur-xl overflow-hidden relative transition-all duration-300"
          style={{
            background: isLocationEnabled
              ? 'rgba(66,133,244,0.18)'
              : 'rgba(15,23,42,0.82)',
            borderColor: isLocationEnabled
              ? 'rgba(66,133,244,0.45)'
              : 'rgba(255,255,255,0.1)',
            boxShadow: isLocationEnabled
              ? '0 0 0 1px rgba(66,133,244,0.3), 0 0 18px rgba(66,133,244,0.2), 0 4px 16px rgba(0,0,0,0.4)'
              : '0 4px 16px rgba(0,0,0,0.35)',
          }}
        >
          {/* Top shimmer */}
          <div
            className="absolute top-0 left-2 right-2 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
          />

          {isLocating ? (
            <Loader2 size={20} className="animate-spin" style={{ color: '#60A5FA' }} />
          ) : isLocationEnabled ? (
            <LocateFixed size={20} style={{ color: '#60A5FA' }} />
          ) : (
            <LocateOff size={20} style={{ color: '#9CA3AF' }} />
          )}
        </motion.button>

        {/* Tooltip */}
        <div className="absolute right-0 top-[calc(100%+8px)] pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50">
          <div
            className="relative rounded-xl px-3 py-2 whitespace-nowrap"
            style={{
              background: 'rgba(10,14,26,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div
              className="absolute top-0 left-3 right-3 h-px rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
            />
            <p className="text-[11px] font-medium text-gray-300">
              {isLocationEnabled ? 'Disable my location' : 'Show my location'}
            </p>
          </div>
          <div
            className="absolute -top-[5px] right-4 w-2.5 h-2.5 rotate-45"
            style={{
              background: 'rgba(10,14,26,0.95)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
