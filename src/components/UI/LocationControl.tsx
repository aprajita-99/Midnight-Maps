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
    UNSUPPORTED: 'Geolocation is not supported by your browser.',
  };

  return (
    <div className="absolute bottom-28 right-6 z-20 flex flex-col items-end gap-3">
      {/* Error toast */}
      <AnimatePresence>
        {locationError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="max-w-[220px] bg-red-900/80 backdrop-blur-xl text-red-200 text-xs px-4 py-2.5 rounded-xl border border-red-500/30 shadow-xl text-right"
          >
            {errorMessages[locationError]}
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Use as Start" badge */}
      <AnimatePresence>
        {isLocationEnabled && userLocation && (
          <motion.button
            key="use-start"
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            onClick={handleUseAsStart}
            className="bg-dark-800/80 backdrop-blur-xl text-white text-xs font-semibold px-4 py-2.5 rounded-full border border-[#4285F4]/40 shadow-xl hover:bg-[#4285F4]/20 hover:border-[#4285F4]/60 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <span
              className="w-2 h-2 rounded-full bg-[#4285F4] shadow-[0_0_6px_2px_rgba(66,133,244,0.6)]"
            />
            Use as Start
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main location button */}
      <motion.button
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.93 }}
        onClick={toggleLocation}
        title={isLocationEnabled ? 'Disable my location' : 'Show my location'}
        className={[
          'w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border transition-all duration-300',
          'backdrop-blur-xl',
          isLocationEnabled
            ? 'bg-[#4285F4]/20 border-[#4285F4]/60 text-[#4285F4] shadow-[0_0_20px_4px_rgba(66,133,244,0.25)]'
            : 'bg-dark-800/80 border-white/10 text-gray-400 hover:text-white hover:border-white/20',
        ].join(' ')}
      >
        {isLocating ? (
          <Loader2 size={22} className="animate-spin text-[#4285F4]" />
        ) : isLocationEnabled ? (
          <LocateFixed size={22} />
        ) : (
          <LocateOff size={22} />
        )}
      </motion.button>
    </div>
  );
}
