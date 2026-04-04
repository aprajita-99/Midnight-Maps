import { create } from 'zustand';

export interface LocationInfo {
  address: string;
  lat: number;
  lng: number;
}

export type MapTypeId = 'roadmap' | 'hybrid';

export type TravelMode = "DRIVING" | "TWO_WHEELER" | "WALKING" | "BICYCLING";

export interface RouteMetric {
  routeIndex: number;
  meanSafety: number;
  risk: number;
  minScore: number;
  distance: number;
  duration: number;
  label?: 'Shortest' | 'Safest' | 'Balanced' | null;
  features?: {
    lighting: number;
    camera: number;
    activity: number;
    environment: number;
  };
}

interface NavigationState {
  startLocation: LocationInfo | null;
  endLocation: LocationInfo | null;
  mapType: MapTypeId;
  travelMode: TravelMode;
  directionsResult: google.maps.DirectionsResult | null;
  selectedRouteIndex: number;
  
  // Route analysis results
  routeAnalysis: RouteMetric[] | null;
  shortestRouteIndex: number | null;
  safestRouteIndex: number | null;
  balancedRouteIndex: number | null;

  // Map Overlay Toggles
  showCameras: boolean;
  showLamps: boolean;
  showPolice: boolean;

  isLoading: boolean;
  error: string | null;
  feedbackStatus: string | null;
  
  setStartLocation: (loc: LocationInfo | null) => void;
  setEndLocation: (loc: LocationInfo | null) => void;
  setMapType: (type: MapTypeId) => void;
  setTravelMode: (mode: TravelMode) => void;
  setDirectionsResult: (result: google.maps.DirectionsResult | null) => void;
  setSelectedRouteIndex: (index: number) => void;
  setRouteAnalysis: (analysis: any) => void;
  submitFeedback: (type: 'segment' | 'route', targetId: any, rating: number) => Promise<void>;
  showTripSummary: boolean;
  setShowTripSummary: (show: boolean) => void;
  // Overlay Setters
  setShowCameras: (show: boolean) => void;
  setShowLamps: (show: boolean) => void;
  setShowPolice: (show: boolean) => void;

  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  startLocation: null,
  endLocation: null,
  mapType: 'roadmap',
  travelMode: "DRIVING",
  directionsResult: null,
  selectedRouteIndex: 0,
  feedbackStatus: null,
  
  routeAnalysis: null,
  shortestRouteIndex: 0, 
  safestRouteIndex: null,
  balancedRouteIndex: null,

  // Initialize overlays as hidden
  showCameras: false,
  showLamps: false,
  showPolice: false,

  isLoading: false,
  error: null,
  // ... existing state ...
  showTripSummary: false,
  setShowTripSummary: (show) => set({ showTripSummary: show }),
  
  setStartLocation: (loc) => set({ startLocation: loc }),
  setEndLocation: (loc) => set({ endLocation: loc }),
  setMapType: (type) => set({ mapType: type }),
  setTravelMode: (mode) => set({ travelMode: mode }),
  setDirectionsResult: (result) => {
    const routeCount = result?.routes?.length || 0;
    set({ 
      directionsResult: result, 
      selectedRouteIndex: 0, 
      routeAnalysis: null,
      shortestRouteIndex: 0, 
      safestRouteIndex: routeCount > 1 ? 1 : 0,
      balancedRouteIndex: routeCount > 2 ? 2 : (routeCount > 1 ? 1 : 0),
      error: null 
    });
  },
  setSelectedRouteIndex: (index) => set({ selectedRouteIndex: index }),
  setRouteAnalysis: (analysis) => set({
    routeAnalysis: analysis.routes,
    shortestRouteIndex: analysis.indices.shortest,
    safestRouteIndex: analysis.indices.safest,
    balancedRouteIndex: analysis.indices.balanced
  }),
  submitFeedback: async (type, targetId, rating) => {
    try {
      // Grab the user's exact local time slot
      const localTimeSlot = Math.floor(new Date().getHours() / 2);
      
      const response = await fetch('/api/segments/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type,
          data: targetId,
          rating: rating,
          timeSlot: localTimeSlot,
          userId: 'hackathon_demo_user' // Anonymous identifier
        })
      });

      const result = await response.json();
      if (result.success) {
        // Show a success message in the UI
        set({ feedbackStatus: "Model Updated" });
        
        // Clear the success message after 3 seconds so they can rate again later if needed
        setTimeout(() => set({ feedbackStatus: null }), 3000);
      }
    } catch (err) {
      console.error("Failed to submit feedback", err);
    }
  },

  // Overlay Actions
  setShowCameras: (show) => set({ showCameras: show }),
  setShowLamps: (show) => set({ showLamps: show }),
  setShowPolice: (show) => set({ showPolice: show }),

  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, directionsResult: null, isLoading: false }),
}));
