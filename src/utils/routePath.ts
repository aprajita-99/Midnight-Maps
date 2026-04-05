export interface RoutePoint {
  lat: number;
  lng: number;
}

type LatLngLike = RoutePoint | Pick<google.maps.LatLng, 'lat' | 'lng'>;

function toPoint(latLng: LatLngLike): RoutePoint {
  const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
  const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;

  return { lat, lng };
}

function dedupeRoutePoints(points: RoutePoint[]): RoutePoint[] {
  return points.filter((point, index, allPoints) => {
    if (index === 0) {
      return true;
    }

    const previousPoint = allPoints[index - 1];
    return previousPoint.lat !== point.lat || previousPoint.lng !== point.lng;
  });
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

function buildCumulativeDistances(points: RoutePoint[]) {
  const cumulativeDistances = [0];

  for (let index = 1; index < points.length; index += 1) {
    cumulativeDistances.push(
      cumulativeDistances[index - 1] +
        haversineM(
          points[index - 1].lat,
          points[index - 1].lng,
          points[index].lat,
          points[index].lng
        )
    );
  }

  return cumulativeDistances;
}

export function extractRoutePath(
  route: google.maps.DirectionsRoute | null | undefined
): RoutePoint[] {
  if (!route) {
    return [];
  }

  const stepPoints =
    route.legs[0]?.steps.flatMap((step) => {
      if (step.path?.length) {
        return step.path.map(toPoint);
      }

      return [toPoint(step.start_location), toPoint(step.end_location)];
    }) ?? [];

  const fallbackPoints = route.overview_path?.map(toPoint) ?? [];
  const path = stepPoints.length > 1 ? stepPoints : fallbackPoints;

  return dedupeRoutePoints(path);
}

export function buildRouteSegments(points: RoutePoint[]) {
  return points.slice(0, -1).map((point, index) => ({
    startLat: point.lat,
    startLng: point.lng,
    endLat: points[index + 1].lat,
    endLng: points[index + 1].lng,
  }));
}

export function cloneDirectionsWithRoute(
  directionsResult: google.maps.DirectionsResult | null | undefined,
  routeIndex: number
): google.maps.DirectionsResult | null {
  const selectedRoute = directionsResult?.routes[routeIndex];

  if (!directionsResult || !selectedRoute) {
    return null;
  }

  return {
    ...directionsResult,
    routes: [selectedRoute],
  } as google.maps.DirectionsResult;
}

function projectPointOntoSegment(
  point: RoutePoint,
  start: RoutePoint,
  end: RoutePoint
) {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  const segmentLengthSquared = dx * dx + dy * dy;

  if (segmentLengthSquared === 0) {
    return {
      projectedPoint: start,
      distanceSquared:
        (point.lng - start.lng) * (point.lng - start.lng) +
        (point.lat - start.lat) * (point.lat - start.lat),
    };
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) /
        segmentLengthSquared
    )
  );

  const projectedPoint = {
    lat: start.lat + dy * t,
    lng: start.lng + dx * t,
  };

  return {
    projectedPoint,
    distanceSquared:
      (point.lng - projectedPoint.lng) * (point.lng - projectedPoint.lng) +
      (point.lat - projectedPoint.lat) * (point.lat - projectedPoint.lat),
  };
}

export function splitRoutePath(
  points: RoutePoint[],
  currentPosition: RoutePoint | null
) {
  if (points.length === 0) {
    return { traveled: [], remaining: [] };
  }

  if (!currentPosition || points.length === 1) {
    return { traveled: [], remaining: points };
  }

  let bestSegmentIndex = 0;
  let bestProjectedPoint = points[0];
  let bestDistanceSquared = Number.POSITIVE_INFINITY;

  for (let index = 0; index < points.length - 1; index += 1) {
    const projection = projectPointOntoSegment(
      currentPosition,
      points[index],
      points[index + 1]
    );

    if (projection.distanceSquared < bestDistanceSquared) {
      bestDistanceSquared = projection.distanceSquared;
      bestSegmentIndex = index;
      bestProjectedPoint = projection.projectedPoint;
    }
  }

  return {
    traveled: dedupeRoutePoints([
      ...points.slice(0, bestSegmentIndex + 1),
      bestProjectedPoint,
    ]),
    remaining: dedupeRoutePoints([
      bestProjectedPoint,
      ...points.slice(bestSegmentIndex + 1),
    ]),
  };
}

export function splitRoutePathByDistance(
  points: RoutePoint[],
  distanceAlongRoute: number | null | undefined
) {
  if (points.length === 0) {
    return { traveled: [], remaining: [] };
  }

  if (distanceAlongRoute == null || !Number.isFinite(distanceAlongRoute)) {
    return { traveled: [], remaining: points };
  }

  if (points.length === 1) {
    return {
      traveled: distanceAlongRoute > 0 ? points : [],
      remaining: points,
    };
  }

  const cumulativeDistances = buildCumulativeDistances(points);
  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1] ?? 0;
  const clampedDistance = Math.min(Math.max(distanceAlongRoute, 0), totalDistance);

  if (clampedDistance <= 0) {
    return { traveled: [], remaining: points };
  }

  if (clampedDistance >= totalDistance) {
    return { traveled: points, remaining: [points[points.length - 1]] };
  }

  let segmentIndex = 0;
  while (
    segmentIndex < cumulativeDistances.length - 1 &&
    cumulativeDistances[segmentIndex + 1] < clampedDistance
  ) {
    segmentIndex += 1;
  }

  const segmentStart = points[segmentIndex];
  const segmentEnd = points[segmentIndex + 1];
  const segmentStartDistance = cumulativeDistances[segmentIndex] ?? 0;
  const segmentEndDistance = cumulativeDistances[segmentIndex + 1] ?? segmentStartDistance;
  const segmentDistance = Math.max(segmentEndDistance - segmentStartDistance, 0);
  const progressRatio =
    segmentDistance === 0 ? 0 : (clampedDistance - segmentStartDistance) / segmentDistance;

  const projectedPoint = {
    lat: segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * progressRatio,
    lng: segmentStart.lng + (segmentEnd.lng - segmentStart.lng) * progressRatio,
  };

  return {
    traveled: dedupeRoutePoints([
      ...points.slice(0, segmentIndex + 1),
      projectedPoint,
    ]),
    remaining: dedupeRoutePoints([
      projectedPoint,
      ...points.slice(segmentIndex + 1),
    ]),
  };
}

export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
