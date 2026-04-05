import { MapPin, Navigation, ArrowDownUp, Search , X } from 'lucide-react';
import LocationSearchInput from './LocationSearchInput';
import TravelModeTabs from './TravelModeTabs';
import { useNavigationStore } from '../../store/useNavigationStore';
import { useDirections } from '../../hooks/useDirections';
import { useUserLocation } from '../../hooks/useUserLocation';
import { motion } from 'framer-motion';

export default function SearchBar() {
  const { startLocation, endLocation, setStartLocation, setEndLocation, setDirectionsResult } = useNavigationStore();
  const { fetchDirections } = useDirections();
  const { enableLocation } = useUserLocation();

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setStartLocation({ address: 'My Current Location', lat, lng });
        // Also enable global blue dot via the shared hook's GPS watch
        enableLocation();
        setTimeout(() => fetchDirections(), 50);
      },
      (err) => console.error('Location denied:', err)
    );
  };

  const handleClear = () => {
    setStartLocation(null);
    setEndLocation(null);
    setDirectionsResult(null); // This automatically wipes the polylines and analysis!
  };

  const handleRouteSearch = () => {
    fetchDirections();
  };

  const handleSwap = () => {
    if (!startLocation && !endLocation) return;
    
    // Safely swap the raw values
    const tempStart = startLocation;
    const tempEnd = endLocation;
    
    setStartLocation(tempEnd);
    setEndLocation(tempStart);
    
    setTimeout(() => {
      fetchDirections();
    }, 50);
  };



  return (
    <div className="w-full flex flex-col gap-3">
      <TravelModeTabs />

      {/* Inputs + swap button scoped to their own relative container */}
      <div className="relative flex flex-col gap-3">
        <LocationSearchInput 
          placeholder="Start point or coordinates (lat, lng)" 
          icon={<MapPin size={18} className="text-primary-blue" />}
          onLocationSelect={setStartLocation}
          value={startLocation?.address || ''}
          onUseMyLocation={handleUseMyLocation}
        />

        {/* Swap button — centered vertically between the two inputs */}
        <div 
          onClick={handleSwap}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/5 backdrop-blur-md p-1.5 rounded-xl border border-white/10 z-20 cursor-pointer hover:bg-primary-green/20 hover:text-primary-green hover:border-primary-green/30 transition-all duration-300 shadow-xl"
        >
          <ArrowDownUp size={14} className="hover:text-inherit" />
        </div>

        <LocationSearchInput 
          placeholder="Destination or coordinates (lat, lng)" 
          icon={<Navigation size={18} className="text-primary-green" />}
          onLocationSelect={setEndLocation}
          value={endLocation?.address || ''}
        />
      </div>

      <div className="flex gap-2 mt-2">
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(34,197,94,0.15)', backgroundColor: 'rgba(34,197,94,0.15)' }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRouteSearch}
          className="flex-1 py-3.5 bg-primary-green/5 backdrop-blur-xl text-primary-green font-black uppercase tracking-widest rounded-xl border border-primary-green/20 hover:border-primary-green/40 transition-all duration-300 flex justify-center items-center gap-2 shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
        >
          <Search size={18} strokeWidth={3} />
          Find Routes
        </motion.button>

        {/* Only show clear button if there is data to clear */}
        {(startLocation || endLocation) && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClear}
            className="px-4 py-3.5 bg-white/5 text-red-400 font-bold rounded-xl border border-white/10 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-all duration-300 flex justify-center items-center shadow-lg backdrop-blur-xl"
            title="Clear Route"
          >
            <X size={20} strokeWidth={3} />
          </motion.button>
        )}
      </div>
    </div>
  );
}
