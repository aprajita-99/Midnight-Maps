const ScoredSegment = require('../models/ScoredSegment');

/**
 * Credit Assignment Problem Solver
 * 
 * When a user rates an entire route, we need to intelligently distribute
 * that feedback to individual segments. We use "inverse safety weighting":
 * - Dangerous segments (low scores) get more weight
 * - Safe segments barely change
 */

/**
 * Decompose a route rating into individual segment adjustments
 * @param {Array} segments - List of segments with their current scores
 * @param {Number} userRating - User's overall route rating (1-5)
 * @param {Number} timeSlot - Which time slot the route was traveled
 * @returns {Array} Segment adjustments with targets and weights
 */
async function decomposeRouteRating(segments, userRating, timeSlot) {
  if (!segments || segments.length === 0) return [];

  // Convert user's 1-5 rating to 0-1 score
  const targetScore = Math.max(0, Math.min(1, (userRating - 1) / 4));

  // Fetch current scores for all segments
  const segmentScores = await Promise.all(
    segments.map(async (seg) => {
      const scoredSeg = await ScoredSegment.findOne({ segment_id: seg.segment_id || seg });
      if (!scoredSeg) return null;
      
      const baseScore = scoredSeg.scores[timeSlot] || 0.5;
      const currentScore = Math.max(0.02, Math.min(0.98, baseScore + scoredSeg.rl_modifier));
      
      return {
        segment_id: seg.segment_id || seg,
        current_score: currentScore,
        inverse_safety: 1 - currentScore  // Key: lower scores get higher weight
      };
    })
  );

  // Remove nulls (segments that don't exist)
  const validScores = segmentScores.filter(s => s !== null);
  if (validScores.length === 0) return [];

  // Calculate total weight (sum of inverse safety)
  const totalWeight = validScores.reduce((sum, s) => sum + s.inverse_safety, 0);

  // Calculate route average
  const routeAverage = validScores.reduce((sum, s) => sum + s.current_score, 0) / validScores.length;

  // Global error: how far off was the AI?
  const globalError = targetScore - routeAverage;

  // Distribute error proportionally to inverse safety weight
  return validScores.map((seg) => {
    const normalizedWeight = seg.inverse_safety / (totalWeight || 1);
    
    // Segment gets a share of the global error
    // Dangerous segments (high inverse_safety) get more
    const segmentError = globalError * normalizedWeight;

    return {
      segment_id: seg.segment_id,
      error_adjustment: segmentError,
      weight: normalizedWeight,
      current_score: seg.current_score,
      target_score: Math.max(0, Math.min(1, seg.current_score + segmentError))
    };
  });
}

/**
 * Calculate route safety from segments
 * This helps us understand what the current AI thinks about a route
 */
async function calculateRouteAvgScore(segmentIds, timeSlot) {
  const segments = await ScoredSegment.find({ segment_id: { $in: segmentIds } });
  
  if (segments.length === 0) return 0.5;

  const total = segments.reduce((sum, seg) => {
    const baseScore = seg.scores[timeSlot] || 0.5;
    return sum + Math.max(0.02, Math.min(0.98, baseScore + seg.rl_modifier));
  }, 0);

  return total / segments.length;
}

/**
 * Detect spam/troll feedback
 * Returns spam weight (0 = spam, 1 = legitimate)
 */
function detectSpamWeight(userHistory) {
  // If user always rates extremes (all 1s or all 5s), downweight them
  if (userHistory.length < 3) return 1.0; // Not enough data
  
  const ratings = userHistory.map(f => f.ratings[0]?.rating || 3);
  const hasOnly1s = ratings.every(r => r === 1);
  const hasOnly5s = ratings.every(r => r === 5);
  
  if (hasOnly1s || hasOnly5s) {
    return 0.3; // Likely spamming, reduce weight to 30%
  }

  // Check variance - reasonable users have varied ratings
  const mean = ratings.reduce((a, b) => a + b) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
  
  if (variance < 0.5) {
    return 0.7; // Low variance, slight downweight
  }

  return 1.0; // Looks legitimate
}

/**
 * Aggregate multiple feedback entries for a segment
 * Handles conflicting ratings intelligently
 */
function aggregateFeedback(feedbackEntries, weights) {
  if (feedbackEntries.length === 0) return 0;

  const weightedSum = feedbackEntries.reduce((sum, entry, i) => {
    const ratings = entry.ratings || [];
    const avgRating = ratings.length > 0 
      ? ratings.reduce((s, r) => s + r.target_score, 0) / ratings.length 
      : 0.5;
    
    return sum + (avgRating * (weights[i] || 1));
  }, 0);

  const totalWeight = weights.reduce((a, b) => a + b, weights.length);
  return weightedSum / totalWeight;
}

module.exports = {
  decomposeRouteRating,
  calculateRouteAvgScore,
  detectSpamWeight,
  aggregateFeedback
};
