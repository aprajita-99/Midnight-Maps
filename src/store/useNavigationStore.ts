import { create } from 'zustand';
import { getTimeSlot } from '../utils/timeUtils';

export interface LocationInfo {
  address: string;
  lat: number;
  lng: number;
}

export type MapTypeId = 'roadmap' | 'hybrid';

export type TravelMode = "DRIVING" | "TWO_WHEELER" | "WALKING" | "BICYCLING";

export interface RouteFeedbackChunk {
  id: string;
  label: string;
  distance: number;
  segmentIds: string[];
  sampleCount: number;
}

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
  feedbackChunks?: RouteFeedbackChunk[];
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
  showTraffic: boolean;
  showNearbyAlerts: boolean;

  // Navigation modes
  isSimulationMode: boolean;
  isSimulationRunning: boolean;
  simulationSpeed: number; // meters per second

  // Demo features
  isDemoNightMode: boolean;
  setDemoNightMode: (v: boolean) => void;

  // Onboarding
  isReadmeOpen: boolean;
  setReadmeOpen: (v: boolean) => void;

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
  submitFeedback: (type: 'segment' | 'route', targetId: any, rating: number) => Promise<boolean>;
  submitRouteChunkFeedback: (payload: {
    chunks: RouteFeedbackChunk[];
    safestChunkId: string;
    unsafeChunkId: string;
  }) => Promise<boolean>;
  showTripSummary: boolean;
  setShowTripSummary: (show: boolean) => void;
  // Overlay Setters
  setShowCameras: (show: boolean) => void;
  setShowLamps: (show: boolean) => void;
  setShowPolice: (show: boolean) => void;
  setShowTraffic: (show: boolean) => void;
  setShowNearbyAlerts: (show: boolean) => void;

  // Simulation controls
  setIsSimulationMode: (sim: boolean) => void;
  setIsSimulationRunning: (running: boolean) => void;
  setSimulationSpeed: (speed: number) => void;

  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  isInitialLoading: boolean;
  finishInitialLoading: () => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
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
  showTraffic: false,
  showNearbyAlerts: false,

  // Navigation modes
  isSimulationMode: true,
  isSimulationRunning: false,
  simulationSpeed: 12, // 12 m/s default (~43 km/h)

  // Demo features
  isDemoNightMode: false,
  setDemoNightMode: (v) => set({ isDemoNightMode: v }),

  // Onboarding
  isReadmeOpen: false,
  setReadmeOpen: (v) => set({ isReadmeOpen: v }),

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
      isSimulationRunning: false,
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
      const localTimeSlot = getTimeSlot(get().isDemoNightMode);
      const payload =
        type === 'segment'
          ? {
              endpoint: '/api/segments/rate-segment',
              body: {
                segment_id: targetId,
                rating,
                time_slot: localTimeSlot,
                confidence: 0.85,
              },
            }
          : {
              endpoint: '/api/segments/rate-route',
              body: {
                route_segments: Array.isArray(targetId) ? targetId : [targetId],
                overall_rating: rating,
                confidence: 0.8,
              },
            };

      const response = await fetch(payload.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.body),
      });

      const result = await response.json();
      if (result.success) {
        set({ feedbackStatus: "Model Updated" });
        setTimeout(() => set({ feedbackStatus: null }), 3000);
        return true;
      }
    } catch (err) {
      console.error("Failed to submit feedback", err);
    }
    return false;
  },
  submitRouteChunkFeedback: async ({ chunks, safestChunkId, unsafeChunkId }) => {
    try {
      const localTimeSlot = getTimeSlot(get().isDemoNightMode);
      const response = await fetch('https://midnight-maps.onrender.com/api/segments/rate-route-chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_chunks: chunks.map((chunk) => ({
            chunk_id: chunk.id,
            label: chunk.label,
            distance: chunk.distance,
            segment_ids: chunk.segmentIds,
            sample_count: chunk.sampleCount,
          })),
          safest_chunk_id: safestChunkId,
          unsafe_chunk_id: unsafeChunkId,
          time_slot: localTimeSlot,
          confidence: 0.9,
        }),
      });

      const result = await response.json().catch(() => null);
      if (response.ok && result?.success) {
        set({ feedbackStatus: "Model Updated" });
        setTimeout(() => set({ feedbackStatus: null }), 3000);
        return true;
      }

      console.error('Failed to submit route chunk feedback', {
        status: response.status,
        result,
      });
    } catch (err) {
      console.error('Failed to submit route chunk feedback', err);
    }
    return false;
  },

  // Overlay Actions
  setShowCameras: (show) => set({ showCameras: show }),
  setShowLamps: (show) => set({ showLamps: show }),
  setShowPolice: (show) => set({ showPolice: show }),
  setShowTraffic: (show) => set({ showTraffic: show }),
  setShowNearbyAlerts: (show) => set({ showNearbyAlerts: show }),
  setIsSimulationMode: (sim) => set({ isSimulationMode: sim }),
  setIsSimulationRunning: (running) => set({ isSimulationRunning: running }),
  setSimulationSpeed: (speed) => set({ simulationSpeed: Math.max(1, Math.min(100, speed)) }),

  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, directionsResult: null, isLoading: false, isSimulationRunning: false }),
  isInitialLoading: true,
  finishInitialLoading: () => set({ isInitialLoading: false }),
}));
