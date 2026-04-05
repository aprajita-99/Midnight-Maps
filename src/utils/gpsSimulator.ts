// @ts-nocheck
/**
 * GPS Simulator - Simulates GPS movement along a route
 * Movement: 20 m/s (72 km/h, realistic highway speed)
 */

export interface SimulatedPosition {
  latitude: number;
  longitude: number;
  heading: number;
  accuracy: number;
  timestamp: number;
}

/**
 * Haversine formula - calculate distance between two coordinates (in meters)
 */
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate bearing from one point to another (in degrees, 0-360)
 */
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const bearing = Math.atan2(y, x) * (180 / Math.PI);
  
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Move a coordinate in a direction by a distance
 * Returns new [lat, lng]
 */
function moveCoordinate(
  lat: number,
  lng: number,
  bearing: number,
  distanceM: number
): [number, number] {
  const R = 6_371_000;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const θ = (bearing * Math.PI) / 180;
  const δ = distanceM / R;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );

  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );

  return [φ2 * (180 / Math.PI), λ2 * (180 / Math.PI)];
}

export interface RouteSegment {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export class GPSSimulator {
  private segments: RouteSegment[];
  private currentSegmentIndex: number = 0;
  private distanceAlongSegment: number = 0;
  private simulationSpeed: number; // meters per second

  constructor(segments: RouteSegment[], speedMs: number = 20) {
    this.segments = segments;
    this.simulationSpeed = speedMs;
  }

  /**
   * Get next simulated position
   * @param deltaTimeMs - Time elapsed since last call (milliseconds)
   * @returns Simulated position or null if journey complete
   */
  getNextPosition(deltaTimeMs: number): SimulatedPosition | null {
    if (this.currentSegmentIndex >= this.segments.length) {
      return null; // Journey complete
    }

    const segment = this.segments[this.currentSegmentIndex];
    const segmentDistance = haversineM(
      segment.startLat, segment.startLng,
      segment.endLat, segment.endLng
    );

    // Calculate distance to move in this time interval
    const distanceToMove = (this.simulationSpeed * deltaTimeMs) / 1000; // Convert ms to seconds

    // Move along current segment
    this.distanceAlongSegment += distanceToMove;

    // Check if we've reached end of segment(s)
    while (this.distanceAlongSegment > segmentDistance && this.currentSegmentIndex < this.segments.length - 1) {
      this.distanceAlongSegment -= segmentDistance;
      this.currentSegmentIndex += 1;
      
      if (this.currentSegmentIndex < this.segments.length) {
        const nextSeg = this.segments[this.currentSegmentIndex];
        const nextSegDist = haversineM(
          nextSeg.startLat, nextSeg.startLng,
          nextSeg.endLat, nextSeg.endLng
        );
        // Update for loop
        this.distanceAlongSegment = this.distanceAlongSegment; // Keep overflow
      }
    }

    // If we've gone past the last segment, clamp at destination
    if (this.currentSegmentIndex >= this.segments.length - 1) {
      this.distanceAlongSegment = segmentDistance;
      this.currentSegmentIndex = this.segments.length - 1;
    }

    const currentSeg = this.segments[this.currentSegmentIndex];
    const currentSegDist = haversineM(
      currentSeg.startLat, currentSeg.startLng,
      currentSeg.endLat, currentSeg.endLng
    );

    // Clamp distance within segment
    const clampedDistance = Math.min(this.distanceAlongSegment, currentSegDist);

    // Calculate position along current segment
    const progress = currentSegDist > 0 ? clampedDistance / currentSegDist : 1;
    const bearing = calculateBearing(
      currentSeg.startLat, currentSeg.startLng,
      currentSeg.endLat, currentSeg.endLng
    );

    const [newLat, newLng] = moveCoordinate(
      currentSeg.startLat,
      currentSeg.startLng,
      bearing,
      clampedDistance
    );

    return {
      latitude: newLat,
      longitude: newLng,
      heading: bearing,
      accuracy: 5, // Simulated GPS accuracy~5m²
      timestamp: Date.now(),
    };
  }

  /**
   * Check if simulation has completed
   */
  isComplete(): boolean {
    if (this.currentSegmentIndex >= this.segments.length - 1) {
      const lastSeg = this.segments[this.segments.length - 1];
      const lastSegDist = haversineM(
        lastSeg.startLat, lastSeg.startLng,
        lastSeg.endLat, lastSeg.endLng
      );
      return this.distanceAlongSegment >= lastSegDist;
    }
    return false;
  }

  /**
   * Get current progress as percentage (0-100)
   */
  getProgress(): number {
    let totalDistance = 0;
    for (const seg of this.segments) {
      totalDistance += haversineM(
        seg.startLat, seg.startLng,
        seg.endLat, seg.endLng
      );
    }

    let distanceCovered = 0;
    for (let i = 0; i < this.currentSegmentIndex; i++) {
      const seg = this.segments[i];
      distanceCovered += haversineM(
        seg.startLat, seg.startLng,
        seg.endLat, seg.endLng
      );
    }
    distanceCovered += this.distanceAlongSegment;

    return totalDistance > 0 ? (distanceCovered / totalDistance) * 100 : 0;
  }

  /**
   * Reset simulation to start
   */
  reset(): void {
    this.currentSegmentIndex = 0;
    this.distanceAlongSegment = 0;
  }

  /**
   * Update simulation speed (m/s)
   */
  setSpeed(speedMs: number): void {
    this.simulationSpeed = Math.max(1, speedMs);
  }

  /**
   * Get current segment index
   */
  getCurrentSegmentIndex(): number {
    return Math.min(this.currentSegmentIndex, this.segments.length - 1);
  }
}
