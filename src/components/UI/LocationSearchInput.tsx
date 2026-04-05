import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import SuggestionsDropdown from './SuggestionsDropdown';
import type { LocationInfo } from '../../store/useNavigationStore';
import { X } from 'lucide-react';

interface LocationSearchInputProps {
  placeholder: string;
  icon: React.ReactNode;
  onLocationSelect: (location: LocationInfo | null) => void;
  value?: string;
  onUseMyLocation?: () => void;
}

export default function LocationSearchInput({ placeholder, icon, onLocationSelect, value = '', onUseMyLocation }: LocationSearchInputProps) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const debouncedValue = useDebounce(inputValue, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Initialize Auth Services once google object is available
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;

    if (!autocompleteService.current) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
    }
    if (!placesService.current) {
      // PlacesService requires an HTML element
      placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
    }
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsDropdownVisible(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Autocomplete Suggestions
  useEffect(() => {
    if (!autocompleteService.current) return;

    if (!debouncedValue.trim()) {
      setSuggestions([]);
      return;
    }

    // Check for direct coordinate input (lat, lng)
    const coordRegex = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
    if (coordRegex.test(debouncedValue.trim())) {
      const [latStr, lngStr] = debouncedValue.trim().split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      // Basic validation for lat/lng ranges
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setSuggestions([{
          place_id: 'coord-search',
          description: debouncedValue.trim(),
          structured_formatting: {
            main_text: 'Go to coordinates',
            secondary_text: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          },
          isCoordinate: true
        }]);
        return;
      }
    }

    autocompleteService.current.getPlacePredictions(
      { input: debouncedValue },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
        } else {
          setSuggestions([]);
        }
      }
    );
  }, [debouncedValue]);

  const handleSelect = (placeId: string, description: string) => {
    setInputValue(description);
    setIsDropdownVisible(false);

    // Handle Coordinate Search
    if (placeId === 'coord-search') {
      const [lat, lng] = description.split(',').map(Number);
      onLocationSelect({
        address: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat,
        lng,
      });
      return;
    }

    if (!placesService.current) return;

    placesService.current.getDetails(
      {
        placeId,
        fields: ['geometry', 'formatted_address'],
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          onLocationSelect({
            address: place.formatted_address || description,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsDropdownVisible(true);
    if (e.target.value === '') {
      onLocationSelect(null);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setIsDropdownVisible(false);
    onLocationSelect(null);
  };

  return (
    <div className="relative w-full group" ref={wrapperRef}>
      <div className="flex items-center gap-3 bg-white/[0.03] backdrop-blur-xl rounded-xl px-4 py-2.5 border border-white/10 focus-within:border-primary-green/50 focus-within:bg-white/[0.06] focus-within:shadow-[0_0_20px_rgba(34,197,94,0.05)] transition-all duration-300">
        <div className="flex-shrink-0 opacity-80 group-focus-within:opacity-100 transition-opacity">
          {icon}
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsDropdownVisible(true)}
          className="bg-transparent text-white w-full text-sm outline-none placeholder-slate-400 font-medium"
          placeholder={placeholder}
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="flex-shrink-0 text-gray-500 hover:text-white transition-colors p-1"
            tabIndex={-1}
            aria-label="Clear input"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <SuggestionsDropdown
        suggestions={suggestions}
        isVisible={isDropdownVisible}
        onSelect={handleSelect}
        onUseMyLocation={onUseMyLocation}
      />
    </div>
  );
}
