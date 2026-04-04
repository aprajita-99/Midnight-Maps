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
  
  setStartLocation: (loc: LocationInfo | null) => void;
  setEndLocation: (loc: LocationInfo | null) => void;
  setMapType: (type: MapTypeId) => void;
  setTravelMode: (mode: TravelMode) => void;
  setDirectionsResult: (result: google.maps.DirectionsResult | null) => void;
  setSelectedRouteIndex: (index: number) => void;
  setRouteAnalysis: (analysis: any) => void;
  
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

  // Overlay Actions
  setShowCameras: (show) => set({ showCameras: show }),
  setShowLamps: (show) => set({ showLamps: show }),
  setShowPolice: (show) => set({ showPolice: show }),

  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, directionsResult: null, isLoading: false }),
}));
