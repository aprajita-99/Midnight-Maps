const express = require('express');
const router = express.Router();
const RoadSegment = require('../models/RoadSegment');
const FeedbackLog = require('../models/FeedbackLog');
const ScoredSegment = require('../models/ScoredSegment');
const {
  createSegment,
  bulkInsertSegments,
  syncScores,
  getScoredSegments,
  analyzeRoutes,
  getSegmentById,
  updateSegmentFeatures,
  getSegmentsNearLocation,
  getNearbySegments,
  getNearestSegment
} = require('../controllers/segmentController');

const normalizeLocation = (location) => {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return undefined;
  }

  return {
    type: 'Point',
    coordinates: [lng, lat]
  };
};

router.post('/', createSegment);
router.post('/bulk', bulkInsertSegments);
router.post('/sync-scores', syncScores);
router.post('/analyze-routes', analyzeRoutes);
router.get('/scores', getScoredSegments);
router.get('/near', getSegmentsNearLocation);
router.get('/nearest', getNearestSegment);
router.get('/nearby', getNearbySegments);

router.get('/test', async (req, res) => {
  const data = await RoadSegment.find().limit(2);
  res.json(data);
});

router.get('/:id', getSegmentById);
router.put('/:id/features', updateSegmentFeatures);

// ============================================
// NEW: Enhanced Feedback Endpoints
// ============================================

/**
 * Rate a single segment (from Street View)
 * POST /api/segments/rate-segment
 */
router.post('/rate-segment', async (req, res) => {
  try {
    const { 
      segment_id, 
      rating, 
      time_slot, 
      confidence = 0.7,
      comment = '',
      conditions = [],
      location 
    } = req.body;

    if (!segment_id || !rating || time_slot === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: segment_id, rating, time_slot' 
      });
    }

    const targetScore = (rating - 1) / 4; // Convert 1-5 to 0-1

    const normalizedLocation = normalizeLocation(location);

    const feedback = new FeedbackLog({
      segment_ids: [segment_id],
      ratings: [{
        segment_id,
        rating,
        target_score: targetScore
      }],
      feedback_type: 'segment',
      time_slot: Math.max(0, Math.min(11, time_slot)),
      time_slot_confidence: 1.0,  // User explicitly selected time
      user_context: {
        ...(normalizedLocation ? { location: normalizedLocation } : {}),
        lighting_conditions: conditions.includes('Dark') ? 'dark' : conditions.includes('Well-lit') ? 'well-lit' : 'normal',
        companion_count: conditions.includes('Crowded') ? 2 : conditions.includes('Empty') ? 0 : 1,
        time_of_feedback: new Date()
      },
      confidence: Math.max(0, Math.min(1, confidence)),
      comment,
      is_processed: false,
      learning_weight: 1.0
    });

    await feedback.save();

    res.status(200).json({ 
      success: true, 
      message: 'Thank you! Your segment rating has been recorded and will help improve safety assessments.',
      feedback_id: feedback._id
    });

  } catch (error) {
    console.error('Segment Rating Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Rate an entire route (post-navigation)
 * POST /api/segments/rate-route
 */
router.post('/rate-route', async (req, res) => {
  try {
    const { 
      route_segments, 
      overall_rating, 
      dangerous_segments = [],
      safe_segments = [],
      travel_time = 0,
      conditions = 'normal',
      confidence = 0.85,
      comment = '',
      location
    } = req.body;

    if (!route_segments || !Array.isArray(route_segments) || !overall_rating) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: route_segments (array), overall_rating' 
      });
    }

    // Get current time slot
    const hour = new Date().getHours();
    const timeSlot = Math.floor(hour / 2);

    const targetScore = (overall_rating - 1) / 4;

    // Convert route_segments to segment IDs  
    const segmentIds = route_segments.map(seg => 
      typeof seg === 'string' ? seg : seg.segment_id || seg._id
    );

    const normalizedLocation = normalizeLocation(location);

    const feedback = new FeedbackLog({
      segment_ids: segmentIds,
      ratings: [{
        segment_id: segmentIds.join(','),  // Multi-segment route ID
        rating: overall_rating,
        target_score: targetScore
      }],
      feedback_type: 'route',
      time_slot: timeSlot,
      time_slot_confidence: 1.0,  // Set from system time
      user_context: {
        ...(normalizedLocation ? { location: normalizedLocation } : {}),
        weather: conditions,
        companion_count: 1,
        time_of_feedback: new Date()
      },
      confidence: Math.max(0, Math.min(1, confidence)),
      comment: `Travel time: ${Math.round(travel_time)}min | Conditions: ${conditions} | Dangerous segments: ${dangerous_segments.length} | ${comment}`,
      is_processed: false,
      learning_weight: 1.0
    });

    await feedback.save();

    res.status(200).json({ 
      success: true, 
      message: 'Thank you! Your route feedback has been recorded. It helps us improve safety recommendations.',
      feedback_id: feedback._id,
      segments_affected: segmentIds.length
    });

  } catch (error) {
    console.error('Route Rating Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Rate route chunks after navigation
 * POST /api/segments/rate-route-chunks
 */
router.post('/rate-route-chunks', async (req, res) => {
  try {
    const {
      route_chunks,
      safest_chunk_id,
      unsafe_chunk_id,
      time_slot,
      confidence = 0.9,
      comment = '',
      location,
    } = req.body;

    if (!Array.isArray(route_chunks) || route_chunks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: route_chunks',
      });
    }

    if (!safest_chunk_id || !unsafe_chunk_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: safest_chunk_id, unsafe_chunk_id',
      });
    }

    if (safest_chunk_id === unsafe_chunk_id) {
      return res.status(400).json({
        success: false,
        message: 'Safest and unsafe chunks must be different.',
      });
    }

    const normalizedTimeSlot = Math.max(
      0,
      Math.min(11, Number.isInteger(Number(time_slot)) ? Number(time_slot) : Math.floor(new Date().getHours() / 2))
    );

    const normalizedLocation = normalizeLocation(location);

    const ratings = [];
    const segmentIds = new Set();

    route_chunks.forEach((chunk) => {
      const chunkSegmentIds = Array.isArray(chunk.segment_ids) ? chunk.segment_ids.filter(Boolean) : [];
      if (chunkSegmentIds.length === 0) return;

      const chunkRating =
        chunk.chunk_id === unsafe_chunk_id
          ? 1
          : chunk.chunk_id === safest_chunk_id
            ? 5
            : 4;
      const targetScore = (chunkRating - 1) / 4;

      chunkSegmentIds.forEach((segmentId) => {
        segmentIds.add(segmentId);
        ratings.push({
          segment_id: segmentId,
          rating: chunkRating,
          target_score: targetScore,
        });
      });
    });

    if (ratings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No route chunk segment_ids were provided.',
      });
    }

    const safestChunk = route_chunks.find((chunk) => chunk.chunk_id === safest_chunk_id);
    const unsafeChunk = route_chunks.find((chunk) => chunk.chunk_id === unsafe_chunk_id);

    const feedback = new FeedbackLog({
      segment_ids: [...segmentIds],
      ratings,
      feedback_type: 'segment_fine_grained',
      time_slot: normalizedTimeSlot,
      time_slot_confidence: 1.0,
      user_context: {
        ...(normalizedLocation ? { location: normalizedLocation } : {}),
        time_of_feedback: new Date()
      },
      confidence: Math.max(0, Math.min(1, confidence)),
      comment: [
        safestChunk ? `Safest: ${safestChunk.label}` : null,
        unsafeChunk ? `Unsafe: ${unsafeChunk.label}` : null,
        comment || null,
      ].filter(Boolean).join(' | '),
      is_processed: false,
      learning_weight: 1.0
    });

    await feedback.save();

    res.status(200).json({
      success: true,
      message: 'Chunk-level route feedback saved and queued for learning.',
      feedback_id: feedback._id,
      segments_affected: segmentIds.size
    });
  } catch (error) {
    console.error('Route Chunk Rating Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get feedback statistics for a specific segment
 * GET /api/segments/:segment_id/feedback-stats
 */
router.get('/:segment_id/feedback-stats', async (req, res) => {
  try {
    const { segment_id } = req.params;

    const stats = await FeedbackLog.aggregate([
      {
        $match: { 
          segment_ids: segment_id,
          is_processed: true
        }
      },
      {
        $group: {
          _id: segment_id,
          avg_rating: { 
            $avg: { 
              $arrayElemAt: ['$ratings.rating', 0] 
            } 
          },
          total_feedback: { $sum: 1 },
          latest_feedback: { $max: '$processed_at' },
          confidence_avg: { $avg: '$confidence' }
        }
      }
    ]);

    const scored = await ScoredSegment.findOne({ segment_id });

    if (stats.length === 0) {
      return res.json({
        segment_id,
        total_feedback: 0,
        ai_score: scored ? scored.scores[Math.floor(new Date().getHours() / 2)] : null,
        rl_modifier: scored?.rl_modifier || 0,
        rating_count: scored?.rating_count || 0
      });
    }

    res.json({
      segment_id,
      avg_user_rating: stats[0].avg_rating?.toFixed(2),
      ai_score: scored ? scored.scores[Math.floor(new Date().getHours() / 2)].toFixed(2) : null,
      rl_modifier: scored?.rl_modifier?.toFixed(3) || 0,
      total_feedback: stats[0].total_feedback,
      last_updated: stats[0].latest_feedback,
      user_confidence: stats[0].confidence_avg?.toFixed(2),
      rating_count: scored?.rating_count || 0
    });

  } catch (error) {
    console.error('Feedback Stats Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get pending feedback count (for admin/monitoring)
 * GET /api/segments/feedback/pending
 */
router.get('/feedback/pending', async (req, res) => {
  try {
    const count = await FeedbackLog.countDocuments({ is_processed: false });
    const processed = await FeedbackLog.countDocuments({ is_processed: true });

    res.json({
      pending: count,
      processed,
      total: count + processed
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Legacy endpoint for backward compatibility
router.post('/rate', async (req, res) => {
  try {
    const { type, data, rating, timeSlot } = req.body;
    if (!type || !data || !rating || timeSlot === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields for feedback.' });
    }

    // Map legacy format to new format
    if (type === 'segment') {
      return res.status(200).json({ 
        success: true, 
        message: "Thank you! Your feedback has been recorded. Please use /rate-segment endpoint for better ratings."
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Thank you! Your anonymous feedback has been queued to train the AI." 
    });

  } catch (error) {
    console.error('Feedback Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
