const RoadSegment = require('../models/RoadSegment');
const ScoredSegment = require('../models/ScoredSegment');
const segmentService = require('../services/segmentService');
const scoringService = require('../services/scoringService');
const generateSegmentId = require('../utils/generateSegmentId');

// Create or update a segment
exports.createSegment = async (req, res, next) => {
  try {
    const segment = await segmentService.createOrUpdateSegment(req.body);
    res.status(201).json({ success: true, data: segment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Bulk insert/update segments
exports.bulkInsertSegments = async (req, res, next) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ success: false, message: 'Body must be an array' });

    const result = await segmentService.bulkInsert(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Sync all safety scores manually
exports.syncScores = async (req, res, next) => {
  try {
    const result = await scoringService.recomputeAllScores();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all scored segments
exports.getScoredSegments = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const data = await scoringService.getScoredSegments(limit ? parseInt(limit) : 1000);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- NEW Routing Logic ---

// Helper for finding nearest scored segment for a point
const findNearestScoredSegment = async (lat, lng, radius = 150) => {
  return await ScoredSegment.findOne({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: radius,
      },
    },
  });
};
/**
 * Aligns Google Routes with safety data and computes safety metrics
 * POST /api/segments/analyze-routes
 */
exports.analyzeRoutes = async (req, res) => {
  try {
    const { routes } = req.body;
    if (!Array.isArray(routes)) return res.status(400).json({ success: false, message: 'Routes array required' });

    console.log(`[DEBUG] Analyzing ${routes.length} routes...`);

    const timeSlot = Math.floor(new Date().getHours() / 2);
    const analysisResults = [];

    // FIX 1: Process routes in parallel to prevent massive bottlenecks and timeouts
    await Promise.all(routes.map(async (route, routeIndex) => {
      const points = route.points;
      const segmentScores = [];

      // Sample a maximum of 100 points per route to keep memory stable
      const sampleRate = points.length > 100 ? Math.ceil(points.length / 100) : 1;
      
      const fetchPromises = [];
      for (let i = 0; i < points.length - 1; i += sampleRate) {
        const p1 = points[i];
        const p2 = points[i + sampleRate] || points[points.length - 1];
        
        const midLat = (p1.lat + p2.lat) / 2;
        const midLng = (p1.lng + p2.lng) / 2;
        
        // FIX 2: Radius bumped to 500m. Google's overview_path simplifies long straight lines, 
        // meaning midpoints frequently land far from actual DB intersections.
        fetchPromises.push(findNearestScoredSegment(midLat, midLng, 500));
      }

      // Execute all geospatial DB queries for this route concurrently
      const matchedSegments = await Promise.all(fetchPromises);

      matchedSegments.forEach(matchedSegment => {
        if (matchedSegment && matchedSegment.scores && matchedSegment.scores.length > timeSlot) {
          segmentScores.push(matchedSegment.scores[timeSlot]);
        } else {
          segmentScores.push(0.5); // Fallback neutral if completely unmapped
        }
      });

      // --- NEW MATHEMATICAL SCORING ---
      const meanSafety = segmentScores.reduce((a, b) => a + b, 0) / (segmentScores.length || 1);
      const minScore = segmentScores.length > 0 ? Math.min(...segmentScores) : 0.5;
      
      // FIX 3: Risk is now the PROPORTION of the route that is heavily dangerous (score < 0.45). 
      // If risk is 0.15, it means 15% of the route is in a red zone. The UI can easily format this.
      const dangerousPoints = segmentScores.filter(s => s < 0.45).length;
      const risk = dangerousPoints / (segmentScores.length || 1);

      analysisResults.push({
        routeIndex,
        meanSafety,
        risk, 
        minScore,
        distance: route.distance,
        duration: route.duration,
      });
    }));

    // Ensure array is sorted back to original index order (Promise.all resolves randomly)
    analysisResults.sort((a, b) => a.routeIndex - b.routeIndex);

    // ---------------------------------------------
    // FIX 4: The Route Selection Algorithms
    // ---------------------------------------------
    
    let shortestRouteIndex = 0;
    let minDuration = Infinity;
    
    analysisResults.forEach((res, idx) => {
      if (res.duration < minDuration) {
        minDuration = res.duration;
        shortestRouteIndex = idx;
      }
    });

    // 2. SAFEST ROUTE (Strictly maximum safety score)
    let safestIndex = 0;
    let maxSafetyMetric = -1;
    
    analysisResults.forEach((res, idx) => {
      // Weigh the average safety (70%) and minimum safety (30%)
      const safetyMetric = (res.meanSafety * 0.7) + (res.minScore * 0.3);
      if (safetyMetric > maxSafetyMetric) {
        maxSafetyMetric = safetyMetric;
        safestIndex = idx;
      }
    });

    // 3. BALANCED ROUTE (Safety minus Detour Penalty)
    let balancedIndex = 0;
    let maxBalancedScore = -Infinity;
    
    analysisResults.forEach((res, idx) => {
      // How much longer is this route compared to the absolute fastest?
      // e.g., 600s vs 500s -> (600-500)/500 = 0.20 (It takes 20% more time)
      const timePenalty = (res.duration - minDuration) / (minDuration || 1);
      
      // We start with the Mean Safety, but penalize it if it takes too long.
      // A 20% detour drops the safety score by 0.15 points (0.20 * 0.75).
      // If the safety gain is less than 0.15, the algorithm will stick to the faster route!
      const balancedScore = res.meanSafety - (timePenalty * 0.75);
      
      if (balancedScore > maxBalancedScore) {
        maxBalancedScore = balancedScore;
        balancedIndex = idx;
      }
    });

    console.log(`[DEBUG] Computed Indices -> Shortest: ${shortestRouteIndex}, Safest: ${safestIndex}, Balanced: ${balancedIndex}`);

    res.status(200).json({
      success: true,
      routes: analysisResults,
      indices: {
        shortest: shortestRouteIndex,
        safest: safestIndex,
        balanced: balancedIndex
      }
    });

  } catch (error) {
    console.error('Route analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch segment by ID
exports.getSegmentById = async (req, res, next) => {
  try {
    const segment = await RoadSegment.findOne({ segment_id: req.params.id });
    if (!segment) return res.status(404).json({ success: false, message: 'Segment not found' });
    
    res.status(200).json({ success: true, data: segment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update only features
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
    
    res.status(200).json({ success: true, data: segment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get segments near location (Geospatial query)
exports.getSegmentsNearLocation = async (req, res, next) => {
  try {
    const { lat, lng, radius = 500 } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });

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

    res.status(200).json({ success: true, count: segments.length, data: segments });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get the absolute nearest segment for Street View HUD using native geospatial search
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

// Get nearby segments with recursive radius fallback using MongoDB geospatial search
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

    // Return only required fields as requested
    res.json(segments.map(seg => ({
      segment_id: seg.segment_id,
      midpoint: seg.midpoint,
      features: seg.features
    })));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
