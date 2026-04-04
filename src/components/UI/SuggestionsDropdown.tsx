import { MapPin, LocateFixed, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Suggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  isCoordinate?: boolean;
}

interface SuggestionsDropdownProps {
  suggestions: Suggestion[];
  onSelect: (placeId: string, description: string) => void;
  isVisible: boolean;
  onUseMyLocation?: () => void;
}

export default function SuggestionsDropdown({ suggestions, onSelect, isVisible, onUseMyLocation }: SuggestionsDropdownProps) {
  const hasContent = !!onUseMyLocation || suggestions.length > 0;

  return (
    <AnimatePresence>
      {isVisible && (hasContent) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute z-50 w-full mt-2 bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
          <ul className="max-h-60 overflow-y-auto scrollbar-hide py-1">
            {/* Use my location row — only for start input */}
            {onUseMyLocation && (
              <li
                onClick={onUseMyLocation}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#4285F4]/10 cursor-pointer transition-colors border-b border-white/10"
              >
                <div className="bg-[#4285F4]/15 p-1.5 rounded-lg flex-shrink-0">
                  <LocateFixed size={16} className="text-[#4285F4]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#4285F4]">Use my location</span>
                  <span className="text-xs text-gray-500">Set current GPS position as start</span>
                </div>
              </li>
            )}

            {suggestions.map((suggestion) => (
              <li
                key={suggestion.place_id}
                onClick={() => onSelect(suggestion.place_id, suggestion.description)}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-white/10 cursor-pointer transition-colors border-b border-white/5 last:border-b-0 ${suggestion.isCoordinate ? 'bg-primary-green/5' : ''}`}
              >
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${suggestion.isCoordinate ? 'bg-primary-green/20' : 'bg-dark-700'}`}>
                  {suggestion.isCoordinate ? (
                    <Navigation size={16} className="text-primary-green" />
                  ) : (
                    <MapPin size={16} className="text-gray-400" />
                  )}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className={`text-sm font-medium truncate ${suggestion.isCoordinate ? 'text-primary-green' : 'text-white'}`}>
                    {suggestion.structured_formatting.main_text}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {suggestion.structured_formatting.secondary_text}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
