const ScoredSegment = require('../models/ScoredSegment');
const FeedbackLog = require('../models/FeedbackLog');

// The Learning Rate (Alpha). How fast the AI changes its mind.
// 0.2 means it moves 20% toward the community's opinion per batch.
const ALPHA = 0.2; 

exports.runBatchTraining = async () => {
  console.log("[CRON] 🧠 AI Agent Waking Up: Starting RL Batch Training...");

  // 1. Fetch the inbox (up to 100 new ratings at a time)
  const pendingLogs = await FeedbackLog.find({ is_processed: false }).limit(100);
  if (pendingLogs.length === 0) {
    console.log("[CRON] 💤 No new feedback. Going back to sleep.");
    return;
  }

  // A dictionary to track the net score changes for each segment
  const segmentDeltas = {};
  const initSegment = (id) => {
    if (!segmentDeltas[id]) segmentDeltas[id] = { totalError: 0, count: 0 };
  };

  // 2. Read the inbox and calculate the RL errors
  for (const log of pendingLogs) {
    const targetScore = (log.rating - 1) / 4; // Convert 1-5 stars to 0.0-1.0

    // --- CASE A: User rated a single, specific segment ---
    if (log.target_type === 'segment') {
      const seg = await ScoredSegment.findOne({ segment_id: log.target_id });
      if (seg) {
        // Find what the AI currently thinks the score is
        const currentTotal = Math.max(0.02, Math.min(0.98, (seg.scores[log.time_slot] || 0.5) + seg.rl_modifier));
        
        initSegment(log.target_id);
        segmentDeltas[log.target_id].totalError += (targetScore - currentTotal);
        segmentDeltas[log.target_id].count += 1;
      }
    } 
    
    // --- CASE B: User rated a whole route (The Credit Assignment Problem) ---
    else if (log.target_type === 'route') {
      const segments = await ScoredSegment.find({ segment_id: { $in: log.target_id } });
      if (segments.length === 0) continue;

      // Find what the AI thinks the average safety of this route is
      let routeTotal = 0;
      segments.forEach(s => {
        routeTotal += Math.max(0.02, Math.min(0.98, (s.scores[log.time_slot] || 0.5) + s.rl_modifier));
      });
      const currentRouteAvg = routeTotal / segments.length;
      
      // How wrong was the AI?
      const globalError = targetScore - currentRouteAvg;

      // Distribute blame or praise to the most dangerous segments
      let totalWeight = 0;
      const weights = segments.map(s => {
        const currentTotal = Math.max(0.02, Math.min(0.98, (s.scores[log.time_slot] || 0.5) + s.rl_modifier));
        // The more dangerous a segment is, the higher its weight (blame/praise)
        const weight = (1 - currentTotal); 
        totalWeight += weight;
        return { id: s.segment_id, weight };
      });

      weights.forEach(w => {
        const normalizedWeight = w.weight / (totalWeight || 1);
        const segmentError = globalError * normalizedWeight * segments.length;
        initSegment(w.id);
        segmentDeltas[w.id].totalError += segmentError;
        segmentDeltas[w.id].count += 1;
      });
    }
  }

  // 3. Apply the Averaged Batch Updates to the Database
  const bulkOps = [];
  for (const [segId, data] of Object.entries(segmentDeltas)) {
    if (data.count === 0) continue;
    
    // Average out the trolls! If 5 people rated it, take the average of their adjustments
    const avgError = data.totalError / data.count;
    const modifierChange = ALPHA * avgError;

    bulkOps.push({
      updateOne: {
        filter: { segment_id: segId },
        update: {
          $inc: { 
            rl_modifier: modifierChange, // Nudge the modifier up or down
            rating_count: data.count     // Add to the total number of ratings
          },
          $set: { last_rated_at: new Date() }
        }
      }
    });
  }

  if (bulkOps.length > 0) {
    // Save new scores to the map!
    await ScoredSegment.bulkWrite(bulkOps);
    
    // 4. Mark the inbox tickets as processed
    const logIds = pendingLogs.map(l => l._id);
    await FeedbackLog.updateMany(
      { _id: { $in: logIds } },
      { $set: { is_processed: true } }
    );
    
    console.log(`[CRON] ✅ Successfully trained AI using ${pendingLogs.length} ratings. Updated ${bulkOps.length} road segments.`);
  }
};