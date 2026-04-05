import { Search } from 'lucide-react';
import LocationSearchInput from './LocationSearchInput';
import { useNavigationStore } from '../../store/useNavigationStore';

interface GlobalSearchProps {
  mapRef: React.RefObject<google.maps.Map | null>;
}

export default function GlobalSearch({ mapRef }: GlobalSearchProps) {
  const { setEndLocation } = useNavigationStore();

  const handleLocationSelect = (location: any) => {
    if (location) {
      setEndLocation(location);
      if (mapRef.current) {
        mapRef.current.panTo({ lat: location.lat, lng: location.lng });
        mapRef.current.setZoom(17);
      }
    }
  };

  return (
    <LocationSearchInput
      placeholder="Search a place..."
      icon={<Search size={16} className="text-primary-green" />}
      onLocationSelect={handleLocationSelect}
    />
  );
}
