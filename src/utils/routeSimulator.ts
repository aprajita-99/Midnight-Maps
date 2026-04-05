export interface SimulatedPosition {
  latitude: number;
  longitude: number;
  heading: number;
  accuracy: number;
  timestamp: number;
}

export interface RouteSegment {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusM = 6_371_000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;

  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const bearing = Math.atan2(y, x) * (180 / Math.PI);

  return (bearing + 360) % 360;
}

function moveCoordinate(
  lat: number,
  lng: number,
  bearing: number,
  distanceM: number
): [number, number] {
  const earthRadiusM = 6_371_000;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lng * Math.PI) / 180;
  const theta = (bearing * Math.PI) / 180;
  const delta = distanceM / earthRadiusM;

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) +
      Math.cos(phi1) * Math.sin(delta) * Math.cos(theta)
  );

  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2)
    );

  return [phi2 * (180 / Math.PI), lambda2 * (180 / Math.PI)];
}

function getSegmentDistance(segment: RouteSegment): number {
  return haversineM(
    segment.startLat,
    segment.startLng,
    segment.endLat,
    segment.endLng
  );
}

export class GPSSimulator {
  private readonly segments: RouteSegment[];
  private readonly segmentDistances: number[];
  private readonly totalDistance: number;
  private currentSegmentIndex = 0;
  private distanceAlongSegment = 0;
  private simulationSpeed: number;
  private completed = false;

  constructor(segments: RouteSegment[], speedMs: number = 20) {
    this.segments = segments.filter((segment) =>
      Number.isFinite(segment.startLat) &&
      Number.isFinite(segment.startLng) &&
      Number.isFinite(segment.endLat) &&
      Number.isFinite(segment.endLng)
    );
    this.segmentDistances = this.segments.map(getSegmentDistance);
    this.totalDistance = this.segmentDistances.reduce(
      (distance, segmentDistance) => distance + segmentDistance,
      0
    );
    this.simulationSpeed = Math.max(1, speedMs);
  }

  getNextPosition(deltaTimeMs: number): SimulatedPosition | null {
    if (this.completed || this.segments.length === 0) {
      return null;
    }

    let distanceRemaining = (this.simulationSpeed * Math.max(deltaTimeMs, 0)) / 1000;

    while (distanceRemaining > 0 && this.currentSegmentIndex < this.segments.length) {
      const currentSegmentDistance =
        this.segmentDistances[this.currentSegmentIndex] ?? 0;
      const distanceLeftOnSegment = Math.max(
        0,
        currentSegmentDistance - this.distanceAlongSegment
      );

      if (distanceRemaining < distanceLeftOnSegment) {
        this.distanceAlongSegment += distanceRemaining;
        distanceRemaining = 0;
        break;
      }

      distanceRemaining -= distanceLeftOnSegment;
      this.currentSegmentIndex += 1;
      this.distanceAlongSegment = 0;
    }

    if (this.currentSegmentIndex >= this.segments.length) {
      const lastSegment = this.segments[this.segments.length - 1];
      this.completed = true;
      this.currentSegmentIndex = this.segments.length - 1;

      return {
        latitude: lastSegment.endLat,
        longitude: lastSegment.endLng,
        heading: calculateBearing(
          lastSegment.startLat,
          lastSegment.startLng,
          lastSegment.endLat,
          lastSegment.endLng
        ),
        accuracy: 5,
        timestamp: Date.now(),
      };
    }

    const currentSegment = this.segments[this.currentSegmentIndex];
    const currentSegmentDistance =
      this.segmentDistances[this.currentSegmentIndex] ?? 0;
    const clampedDistance = Math.min(this.distanceAlongSegment, currentSegmentDistance);
    const bearing = calculateBearing(
      currentSegment.startLat,
      currentSegment.startLng,
      currentSegment.endLat,
      currentSegment.endLng
    );
    const [latitude, longitude] =
      currentSegmentDistance === 0
        ? [currentSegment.endLat, currentSegment.endLng]
        : moveCoordinate(
            currentSegment.startLat,
            currentSegment.startLng,
            bearing,
            clampedDistance
          );

    return {
      latitude,
      longitude,
      heading: bearing,
      accuracy: 5,
      timestamp: Date.now(),
    };
  }

  isComplete(): boolean {
    return this.completed;
  }

  getProgress(): number {
    if (this.totalDistance === 0) {
      return 0;
    }

    return (this.getDistanceCoveredMeters() / this.totalDistance) * 100;
  }

  getDistanceCoveredMeters(): number {
    let distanceCovered = 0;
    for (let index = 0; index < this.currentSegmentIndex; index += 1) {
      distanceCovered += this.segmentDistances[index] ?? 0;
    }

    if (this.completed) {
      return this.totalDistance;
    }

    return distanceCovered + Math.min(
      this.distanceAlongSegment,
      this.segmentDistances[this.currentSegmentIndex] ?? 0
    );
  }

  reset(): void {
    this.currentSegmentIndex = 0;
    this.distanceAlongSegment = 0;
    this.completed = false;
  }

  setSpeed(speedMs: number): void {
    this.simulationSpeed = Math.max(1, speedMs);
  }

  getCurrentSegmentIndex(): number {
    if (this.segments.length === 0) {
      return 0;
    }

    return Math.min(this.currentSegmentIndex, this.segments.length - 1);
  }
}
