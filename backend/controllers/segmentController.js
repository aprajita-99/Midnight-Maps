const RoadSegment = require('../models/RoadSegment');
const ScoredSegment = require('../models/ScoredSegment');
const segmentService = require('../services/segmentService');
const scoringService = require('../services/scoringService');
const generateSegmentId = require('../utils/generateSegmentId');
const redisClient = require('../config/redis');

exports.createSegment = async (req, res, next) => {
  try {
    const segment = await segmentService.createOrUpdateSegment(req.body);
    res.status(201).json({ success: true, data: segment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
};

const clampUnitValue = (value, fallback = 0.5) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;

  if (numericValue > 1 && numericValue <= 100) {
    return Math.min(Math.max(numericValue / 100, 0), 1);
  }

  return Math.min(Math.max(numericValue, 0), 1);
};

const normalizeCameraValue = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;

  if (numericValue <= 1) return clampUnitValue(numericValue, 0);
  if (numericValue <= 5) return Math.min(Math.max(numericValue / 5, 0), 1);
  if (numericValue <= 100) return Math.min(Math.max(numericValue / 100, 0), 1);

  return 1;
};

const NIGHT_TIME_SLOTS = [0, 1, 2, 9, 10, 11];

const getNormalizedProfileValue = (value, timeSlot, fallback = 0.5) => {
  if (Array.isArray(value)) {
    return clampUnitValue(value[timeSlot], fallback);
  }

  return clampUnitValue(value, fallback);
};

const getLightingRouteValue = (value, timeSlot) => {
  if (!Array.isArray(value)) {
    return clampUnitValue(value, 0.5);
  }

  const isDaySlot = timeSlot >= 3 && timeSlot < 9;
  if (!isDaySlot) {
    return clampUnitValue(value[timeSlot], 0.5);
  }

  const nightValues = NIGHT_TIME_SLOTS
    .map((slot) => clampUnitValue(value[slot], 0.5))
    .filter((slotValue) => Number.isFinite(slotValue));

  if (!nightValues.length) {
    return clampUnitValue(value[timeSlot], 0.5);
  }

  const totalNightLighting = nightValues.reduce((sum, slotValue) => sum + slotValue, 0);
  return totalNightLighting / nightValues.length;
};

const collapseSegmentSamples = (segmentSamples) => {
  return segmentSamples.reduce((collapsedSamples, sample) => {
    if (!sample.segmentId) return collapsedSamples;

    const previousSample = collapsedSamples[collapsedSamples.length - 1];
    if (previousSample && previousSample.segmentId === sample.segmentId) {
      previousSample.distance += sample.distance;
      previousSample.weightedSafety += sample.weightedSafety;
      previousSample.sampleCount += sample.sampleCount;
      return collapsedSamples;
    }

    collapsedSamples.push({ ...sample });
    return collapsedSamples;
  }, []);
};

const buildFeedbackChunks = (segmentSamples) => {
  const collapsedSamples = collapseSegmentSamples(segmentSamples);
  if (collapsedSamples.length === 0) {
    return [];
  }

  const chunkCount = collapsedSamples.length >= 5
    ? 5
    : collapsedSamples.length >= 4
      ? 4
      : collapsedSamples.length;

  const totalDistance = collapsedSamples.reduce(
    (sum, sample) => sum + sample.distance,
    0
  ) || collapsedSamples.length;
  const targetChunkDistance = totalDistance / Math.max(chunkCount, 1);

  const rawChunks = [];
  let currentChunk = [];
  let currentDistance = 0;

  collapsedSamples.forEach((sample, index) => {
    currentChunk.push(sample);
    currentDistance += sample.distance;

    const remainingSamples = collapsedSamples.length - index - 1;
    const remainingChunks = chunkCount - rawChunks.length - 1;
    const reachedTargetDistance = currentDistance >= targetChunkDistance;
    const mustReserveRemainingSamples = remainingSamples >= remainingChunks;

    if (rawChunks.length === chunkCount - 1) {
      return;
    }

    if (reachedTargetDistance && mustReserveRemainingSamples) {
      rawChunks.push(currentChunk);
      currentChunk = [];
      currentDistance = 0;
    }
  });

  if (currentChunk.length > 0) {
    rawChunks.push(currentChunk);
  }

  return rawChunks.map((chunkSamples, index) => {
    const distance = chunkSamples.reduce((sum, sample) => sum + sample.distance, 0);
    const weightedSafety = chunkSamples.reduce((sum, sample) => sum + sample.weightedSafety, 0);
    const segmentIds = [...new Set(chunkSamples.map((sample) => sample.segmentId).filter(Boolean))];

    return {
      id: `part-${index + 1}`,
      label: `Part ${index + 1}`,
      distance,
      segmentIds,
      sampleCount: chunkSamples.reduce((sum, sample) => sum + sample.sampleCount, 0),
      meanSafety: weightedSafety / (distance || 1),
    };
  }).filter((chunk) => chunk.segmentIds.length > 0);
};

exports.bulkInsertSegments = async (req, res, next) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ success: false, message: 'Body must be an array' });

    const result = await segmentService.bulkInsert(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.syncScores = async (req, res, next) => {
  try {
    const result = await scoringService.recomputeAllScores();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getScoredSegments = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const data = await scoringService.getScoredSegments(limit ? parseInt(limit) : 1000);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const findSegmentData = async (lat, lng, radius = 500) => {
  // 1. Find the physical road segment (for features)
  const roadSegment = await RoadSegment.findOne({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radius,
      },
    },
  });

  if (!roadSegment) return null;

  // 2. Find the matching scored segment (for overall safety)
  const scoredSegment = await ScoredSegment.findOne({ segment_id: roadSegment.segment_id });

  return {
    segment_id: roadSegment.segment_id,
    features: roadSegment.features,
    scores: scoredSegment ? scoredSegment.scores : null
  };
};

exports.analyzeRoutes = async (req, res) => {
  try {
    const { routes, timeSlot: requestedTimeSlot } = req.body;
    if (!Array.isArray(routes)) return res.status(400).json({ success: false, message: 'Routes array required' });

    const parsedTimeSlot = Number(requestedTimeSlot);
    const timeSlot = Number.isInteger(parsedTimeSlot)
      ? Math.min(Math.max(parsedTimeSlot, 0), 11)
      : Math.floor(new Date().getHours() / 2);

const firstRoute = routes[0];
    const startPoint = firstRoute.points[0];
    const endPoint = firstRoute.points[firstRoute.points.length - 1];

    const startLat = Number(startPoint.lat).toFixed(3);
    const startLng = Number(startPoint.lng).toFixed(3);
    const endLat = Number(endPoint.lat).toFixed(3);
    const endLng = Number(endPoint.lng).toFixed(3);

    const cacheKey = `route_analysis:${startLat},${startLng}:to:${endLat},${endLng}:time:${timeSlot}`;

    const cachedAnalysis = await redisClient.get(cacheKey);
    if (cachedAnalysis) {
      console.log(`[Cache HIT] Fast-loading route analysis: ${cacheKey}`);
      // Parse and return immediately! Skip all the math below.
      return res.status(200).json(JSON.parse(cachedAnalysis));
    }

    console.log(`[Cache MISS] Running heavy math for route analysis...`);

    const analysisResults = [];

     await Promise.all(routes.map(async (route, routeIndex) => {
      const points = route.points;

     const sampleRate = points.length > 100 ? Math.ceil(points.length / 100) : 1;
      
      const fetchPromises = [];
      for (let i = 0; i < points.length - 1; i += sampleRate) {
        const p1 = points[i];
        const p2 = points[i + sampleRate] || points[points.length - 1];
        
        const midLat = (p1.lat + p2.lat) / 2;
        const midLng = (p1.lng + p2.lng) / 2;
        
       fetchPromises.push(findSegmentData(midLat, midLng, 500));
      }

      const matchedSegments = await Promise.all(fetchPromises);

      let totalRouteDistanceMeters = 0;
      let dangerousDistanceMeters = 0;
      let weightedSafetySum = 0;
      let minScore = 1.0;

      let totalLighting = 0, totalActivity = 0, totalCamera = 0, totalEnvironment = 0;
      const matchedSegmentSamples = [];

     matchedSegments.forEach((data, index) => {
       const p1 = points[index * sampleRate];
        const p2 = points[(index * sampleRate) + sampleRate] || points[points.length - 1];
        const stepDistance = getDistanceMeters(p1.lat, p1.lng, p2.lat, p2.lng) || 1; // Fallback to 1m to prevent 0 division

        totalRouteDistanceMeters += stepDistance;

        let currentSegmentSafety = 0.5; // Fallback
        if (data && data.scores && data.scores.length > timeSlot) {
          currentSegmentSafety = data.scores[timeSlot];
        }

        weightedSafetySum += (currentSegmentSafety * stepDistance);

        if (currentSegmentSafety < minScore) minScore = currentSegmentSafety;
        if (currentSegmentSafety < 0.45) dangerousDistanceMeters += stepDistance;
        if (data?.segment_id) {
          matchedSegmentSamples.push({
            segmentId: data.segment_id,
            distance: stepDistance,
            weightedSafety: currentSegmentSafety * stepDistance,
            sampleCount: 1,
          });
        }

        if (data && data.features) {
          const f = data.features;
          
          const lightingVal = getLightingRouteValue(f.lighting, timeSlot);
          const activityVal = getNormalizedProfileValue(f.activity, timeSlot, 0.5);
          const cameraVal = normalizeCameraValue(f.camera);
          const envVal = clampUnitValue(f.environment, 0.5);

          totalLighting += (lightingVal * stepDistance);
          totalActivity += (activityVal * stepDistance);
          totalCamera += (cameraVal * stepDistance);
          totalEnvironment += (envVal * stepDistance);
        }
      });
let rawMeanSafety = weightedSafetySum / (totalRouteDistanceMeters || 1);
      const feedbackChunks = buildFeedbackChunks(matchedSegmentSamples);

      let chokePointPenalty = 0;
      if (dangerousDistanceMeters > 150) {
        chokePointPenalty = Math.min((dangerousDistanceMeters / 1000), 0.30); 
      }

      const finalMeanSafety = Math.min(0.98, Math.max(0.05, (0.35 + (rawMeanSafety * 0.65)) - chokePointPenalty));

      const risk = dangerousDistanceMeters / (totalRouteDistanceMeters || 1);
      analysisResults.push({
        routeIndex,
        meanSafety: finalMeanSafety,
        risk, 
        minScore,
        distance: route.distance,
        duration: route.duration,
        feedbackChunks,
       features: {
          lighting: totalLighting / (totalRouteDistanceMeters || 1),
          activity: totalActivity / (totalRouteDistanceMeters || 1),
          camera: totalCamera / (totalRouteDistanceMeters || 1),
          environment: totalEnvironment / (totalRouteDistanceMeters || 1)
        }
      });
    }));

    analysisResults.sort((a, b) => a.routeIndex - b.routeIndex);

     let shortestRouteIndex = 0;
    let minDuration = Infinity;
    
    analysisResults.forEach((res, idx) => {
      if (res.duration < minDuration) {
        minDuration = res.duration;
        shortestRouteIndex = idx;
      }
    });

    let safestIndex = 0;
    let maxSafetyMetric = -1;
    
    analysisResults.forEach((res, idx) => {
      const safetyMetric = (res.meanSafety * 0.7) + (res.minScore * 0.3);
      if (safetyMetric > maxSafetyMetric) {
        maxSafetyMetric = safetyMetric;
        safestIndex = idx;
      }
    });

    let balancedIndex = 0;
    let maxBalancedScore = -Infinity;
    
    analysisResults.forEach((res, idx) => {
      const timePenalty = (res.duration - minDuration) / (minDuration || 1);
      const balancedScore = res.meanSafety - (timePenalty * 0.75);
      if (balancedScore > maxBalancedScore) {
        maxBalancedScore = balancedScore;
        balancedIndex = idx;
      }
    });

    const finalResponse = {
      success: true,
      routes: analysisResults,
      indices: {
        shortest: shortestRouteIndex,
        safest: safestIndex,
        balanced: balancedIndex
      }
    };

    await redisClient.setEx(cacheKey, 43200, JSON.stringify(finalResponse));
    res.status(200).json(finalResponse);

  } catch (error) {
    console.error('Route analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getSegmentById = async (req, res, next) => {
  try {
    const segment = await RoadSegment.findOne({ segment_id: req.params.id });
    if (!segment) return res.status(404).json({ success: false, message: 'Segment not found' });
    
    res.status(200).json({ success: true, data: segment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
exports.updateSegmentFeatures = async (req, res, next) => {
  try {
    const { features } = req.body;
    if (!features) return res.status(400).json({ success: false, message: 'Features required' });

    const segment = await RoadSegment.findOneAndUpdate(
      { segment_id: req.params.id },
      { $set: { features } },
      { new: true, runValidators: true }
    );

    if (!segment) return res.status(404).json({ success: false, message: 'Segment not found' });
    
    await redisClient.del(`segment:${req.params.id}`);

    res.status(200).json({ success: true, data: segment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
exports.getSegmentsNearLocation = async (req, res, next) => {
  try {
    const { lat, lng, radius = 500 } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });

    const roundedLat = Number(lat).toFixed(4);
    const roundedLng = Number(lng).toFixed(4);
    const cacheKey = `segments:near:${roundedLat}:${roundedLng}:${radius}`;

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`[Cache HIT] Serving from Redis: ${cacheKey}`);
      const parsedData = JSON.parse(cachedData);
      return res.status(200).json({ success: true, count: parsedData.length, data: parsedData, source: 'cache' });
    }

    console.log(`[Cache MISS] Querying MongoDB: ${cacheKey}`);
    const segments = await RoadSegment.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius),
        },
      },
    });

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(segments));

    res.status(200).json({ success: true, count: segments.length, data: segments,source: 'database' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
exports.getNearestSegment = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });

    const segment = await RoadSegment.findOne({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: 200, // 200 meters limit for search to handle camera offsets
        },
      },
    });

    if (!segment) {
      return res.status(404).json({ success: false, message: 'No nearby segment found within 200m.' });
    }

    res.status(200).json({ success: true, data: segment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
exports.getNearbySegments = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });

    const searchRadii = [50, 100, 200, 500];
    let segments = [];

    for (const radius of searchRadii) {
      segments = await RoadSegment.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            $maxDistance: radius,
          },
        },
      }).limit(50);

      if (segments.length > 0) break;
    }

    if (segments.length === 0) {
      return res.json({ status: 'no_data' });
    }

   res.json(segments.map(seg => ({
      segment_id: seg.segment_id,
      midpoint: seg.midpoint,
      features: seg.features
    })));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
