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
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-dark-700 p-1.5 rounded-full border border-white/10 z-20 cursor-pointer hover:bg-dark-600 transition shadow-xl"
        >
          <ArrowDownUp size={14} className="text-gray-400" />
        </div>

        <LocationSearchInput 
          placeholder="Destination or coordinates (lat, lng)" 
          icon={<Navigation size={18} className="text-primary-green" />}
          onLocationSelect={setEndLocation}
          value={endLocation?.address || ''}
        />
      </div>

      <div className="flex gap-2 mt-1">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRouteSearch}
          className="flex-1 py-3 bg-primary-green/10 text-primary-green font-bold rounded-xl border border-primary-green/20 hover:bg-primary-green hover:text-dark-900 transition flex justify-center items-center gap-2"
        >
          <Search size={18} />
          Find Routes
        </motion.button>

        {/* Only show clear button if there is data to clear */}
        {(startLocation || endLocation) && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClear}
            className="px-4 py-3 bg-primary-red/10 text-primary-red font-bold rounded-xl border border-primary-red/20 hover:bg-primary-red hover:text-white transition flex justify-center items-center"
            title="Clear Route"
          >
            <X size={20} />
          </motion.button>
        )}
      </div>
    </div>
  );
}
