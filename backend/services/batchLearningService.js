const ScoredSegment = require('../models/ScoredSegment');
const FeedbackLog = require('../models/FeedbackLog');
const { decomposeRouteRating, detectSpamWeight } = require('./creditAssignmentService');

// The Learning Rate (Alpha). How fast the AI changes its mind.
// 0.2 means it moves 20% toward the community's opinion per batch.
const ALPHA = 0.2;
const RETRAINING_THRESHOLD = 0.3; // Immediate retrain if error > 0.3

/**
 * Ensure documents have numeric types for fields we use with $inc
 * This fixes the "Cannot apply $inc to non-numeric type (array)" error
 */
const ensureDataIntegrity = async () => {
  try {
    // Delete any segment where rating_count is an array
    const deletedBrokenData = await ScoredSegment.collection.deleteMany({
      rating_count: { $type: "array" } 
    });

    console.log(`[DATA-FIX] 🗑️ Deleted ${deletedBrokenData.deletedCount} corrupted segments.`);
  } catch (err) {
    console.error("[DATA-FIX] ❌ Error:", err);
  }
};

/**
 * Main batch training loop
 * Processes pending feedback and updates segment safety scores
 */
exports.runBatchTraining = async () => {
  console.log("[CRON] 🧠 AI Agent Waking Up: Starting RL Batch Training...");

  // Force integrity check before training to prevent $inc failures
  await ensureDataIntegrity();

  // 1. Fetch the inbox (up to 100 new ratings at a time)
// ... (rest of function)
  const pendingLogs = await FeedbackLog.find({ is_processed: false }).limit(100);
  if (pendingLogs.length === 0) {
    console.log("[CRON] 💤 No new feedback. Going back to sleep.");
    return;
  }

  // A dictionary to track the net score changes for each segment
  const segmentDeltas = {};
  const initSegment = (id) => {
    if (!segmentDeltas[id]) {
      segmentDeltas[id] = { 
        totalWeightedError: 0,
        totalWeight: 0,
        count: 0,
        needsImmediateRetrain: false
      };
    }
  };

  // 2. Read the inbox and calculate the RL errors
  for (const log of pendingLogs) {
    // --- CASE A: User rated a single, specific segment ---
    if (log.feedback_type === 'segment' || log.feedback_type === 'segment_fine_grained') {
      for (const rating of log.ratings) {
        const seg = await ScoredSegment.findOne({ segment_id: rating.segment_id });
        if (seg) {
          const baseScore = seg.scores[log.time_slot] || 0.5;
          const currentTotal = Math.max(0.02, Math.min(0.98, baseScore + seg.rl_modifier));
          
          // Calculate error and weighted contribution
          const error = rating.target_score - currentTotal;
          const weight = log.confidence * log.time_slot_confidence * log.learning_weight;
          
          initSegment(rating.segment_id);
          segmentDeltas[rating.segment_id].totalWeightedError += error * weight;
          segmentDeltas[rating.segment_id].totalWeight += weight;
          segmentDeltas[rating.segment_id].count += 1;

          // Check if error is large and user confident (immediate retrain)
          if (Math.abs(error) > RETRAINING_THRESHOLD && log.confidence > 0.8) {
            segmentDeltas[rating.segment_id].needsImmediateRetrain = true;
          }
        }
      }
    }
    
    // --- CASE B: User rated a whole route (credit assignment) ---
    else if (log.feedback_type === 'route') {
      const segments = await ScoredSegment.find({ segment_id: { $in: log.segment_ids } });
      if (segments.length === 0) continue;

      // Decompose route rating into segment adjustments using inverse safety weighting
      const segmentAdjustments = await decomposeRouteRating(
        segments,
        log.ratings[0]?.rating || 3,  // Use first rating (should be one overall rating per route)
        log.time_slot
      );

      segmentAdjustments.forEach((adj) => {
        const weight = log.confidence * log.time_slot_confidence * log.learning_weight;
        
        initSegment(adj.segment_id);
        segmentDeltas[adj.segment_id].totalWeightedError += adj.error_adjustment * weight;
        segmentDeltas[adj.segment_id].totalWeight += weight;
        segmentDeltas[adj.segment_id].count += 1;

        // Check for immediate retraining
        if (Math.abs(adj.error_adjustment) > RETRAINING_THRESHOLD && log.confidence > 0.8) {
          segmentDeltas[adj.segment_id].needsImmediateRetrain = true;
        }
      });
    }
  }

  // 3. Apply the Weighted Averaged Batch Updates to the Database
  const bulkOps = [];
  const segmentsToRetrain = [];

  for (const [segId, data] of Object.entries(segmentDeltas)) {
    if (data.count === 0 || data.totalWeight === 0) continue;
    
    // Weighted average error: heavier weight from confident users
    const avgError = data.totalWeightedError / data.totalWeight;
    const modifierChange = ALPHA * avgError;

    // Clamp modifier to prevent wild swings
    bulkOps.push({
      updateOne: {
        filter: { segment_id: segId },
        update: {
          $inc: { 
            rl_modifier: modifierChange,
            rating_count: data.count
          },
          $set: { last_rated_at: new Date() }
        }
      }
    });

    if (data.needsImmediateRetrain) {
      segmentsToRetrain.push(segId);
    }
  }

  // 4. Clamp RL modifiers to prevent runaway learning
  await ScoredSegment.updateMany(
    {},
    [
      {
        $set: {
          rl_modifier: {
            $max: [
              { $min: ['$rl_modifier', 0.3] },  // Max boost: +0.3
              -0.3                               // Min penalty: -0.3
            ]
          }
        }
      }
    ]
  );

  if (bulkOps.length > 0) {
    // Apply batch updates
    await ScoredSegment.bulkWrite(bulkOps);
    
    // 5. Mark all processed logs
    const logIds = pendingLogs.map(l => l._id);
    const batchId = `batch_${Date.now()}`;
    await FeedbackLog.updateMany(
      { _id: { $in: logIds } },
      { 
        $set: { 
          is_processed: true,
          processed_at: new Date(),
          processing_batch: batchId
        }
      }
    );
    
    console.log(`[CRON] ✅ Successfully trained AI using ${pendingLogs.length} ratings.`);
    console.log(`[CRON] ✅ Updated ${bulkOps.length} road segments.`);
    console.log(`[CRON] ⚡ ${segmentsToRetrain.length} segments flagged for immediate assessment.`);
  }
};

/**
 * Detect and downweight spam/troll feedback
 * Run this periodically to adjust learning_weight for problematic raters
 */
exports.detectAndWeightSpamFeedback = async () => {
  console.log("[CRON] 🔍 Analyzing feedback for spam patterns...");

  // Group feedback by estimated user (using location as proxy)
  const feedbackByLocation = await FeedbackLog.aggregate([
    {
      $match: {
        is_processed: false,
        'user_context.location.coordinates.0': { $type: 'number' },
        'user_context.location.coordinates.1': { $type: 'number' }
      }
    },
    {
      $group: {
        _id: {
          lat: { $round: ['$user_context.location.coordinates.1', 2] },
          lng: { $round: ['$user_context.location.coordinates.0', 2] }
        },
        feedbackEntries: { $push: '$$ROOT' },
        count: { $sum: 1 }
      }
    },
    {
      $match: { count: { $gt: 3 } }  // Only analyze users with 3+ submissions
    }
  ]);

  for (const group of feedbackByLocation) {
    const spamWeight = detectSpamWeight(group.feedbackEntries);
    
    if (spamWeight < 1.0) {
      const ids = group.feedbackEntries.map(f => f._id);
      await FeedbackLog.updateMany(
        { _id: { $in: ids } },
        { $set: { learning_weight: spamWeight } }
      );
      console.log(`[CRON] ⚠️ Downweighted ${ids.length} suspicious ratings (weight: ${(spamWeight * 100).toFixed(0)}%)`);
    }
  }
};

/**
 * Check for segments with high discrepancies between AI score and user feedback
 * These are candidates for deeper analysis
 */
exports.identifyHighDiscrepancySegments = async () => {
  const processed = await FeedbackLog.aggregate([
    {
      $match: { is_processed: true, feedback_type: 'segment' }
    },
    {
      $group: {
        _id: '$ratings.segment_id',
        avgRating: { $avg: '$ratings.rating' },
        count: { $sum: 1 }
      }
    },
    {
      $match: { count: { $gte: 5 } }  // At least 5 ratings
    }
  ]);

  const discrepancies = [];
  for (const item of processed) {
    const seg = await ScoredSegment.findOne({ segment_id: item._id });
    if (!seg) continue;

    const avgScore = seg.scores.reduce((a, b) => a + b) / 12;
    const userScore = (item.avgRating - 1) / 4;
    const discrepancy = Math.abs(avgScore - userScore);

    if (discrepancy > 0.4) {
      discrepancies.push({
        segment_id: item._id,
        ai_score: avgScore.toFixed(2),
        user_score: userScore.toFixed(2),
        discrepancy: discrepancy.toFixed(2),
        ratings: item.count
      });
    }
  }

  if (discrepancies.length > 0) {
    console.log('[CRON] 🚨 High discrepancy segments found:');
    discrepancies.forEach(d => {
      console.log(`  - ${d.segment_id}: AI=${d.ai_score} vs User=${d.user_score} (${d.ratings} ratings)`);
    });
  }

  return discrepancies;
};
