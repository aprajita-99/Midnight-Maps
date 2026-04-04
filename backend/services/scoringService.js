const RoadSegment = require('../models/RoadSegment');
const ScoredSegment = require('../models/ScoredSegment');
const computeSafetyScores = require('../utils/computeSafetyScore');

/**
 * Recomputes safety scores for all RoadSegments and syncs them to the ScoredSegment collection.
 * This is a manual trigger function.
 */
const recomputeAllScores = async () => {
  const segments = await RoadSegment.find({}).lean();
  const operations = segments.map((seg) => {
    const scores = computeSafetyScores(seg.features || {});
    
    return {
      updateOne: {
        filter: { segment_id: seg.segment_id },
        update: {
          $set: {
            segment_id: seg.segment_id,
            start: seg.start,
            end: seg.end,
            midpoint: seg.midpoint,
            location: seg.location,
            scores: scores,
          }
        },
        upsert: true,
      }
    };
  });

  if (operations.length === 0) return { success: true, count: 0 };

  const result = await ScoredSegment.bulkWrite(operations);
  return {
    success: true,
    count: segments.length,
    upsertedCount: result.upsertedCount,
    modifiedCount: result.modifiedCount,
  };
};

/**
 * Fetches all scored segments from the database.
 */
const getScoredSegments = async (limit = 1000) => {
  return await ScoredSegment.find({}).limit(limit).lean();
};

module.exports = {
  recomputeAllScores,
  getScoredSegments,
};
