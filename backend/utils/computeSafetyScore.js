/**
 * Computes safety scores for each of the 12 time slots (0-11) based on segment features.
 * 
 * New Priorities:
 * - 45% Lighting (Primary safety factor)
 * - 30% Activity (Presence of people)
 * - 20% Camera Score (Surveillance)
 * - 05% Infrastructure Environment (Minor factor due to inaccuracy)
 */
const computeSafetyScores = (features) => {
  const NUM_SLOTS = 12;
  const scores = [];

  // Arrays from features (expected length 12)
  let lighting_arr = Array.isArray(features.lighting) ? features.lighting : Array(NUM_SLOTS).fill(0.5);
  let activity_arr = Array.isArray(features.activity) ? features.activity : Array(NUM_SLOTS).fill(0.5);

  // Fallbacks if arrays are wrong length
  if (lighting_arr.length !== NUM_SLOTS) {
    const avg = lighting_arr.length > 0 ? lighting_arr.reduce((a, b) => a + b, 0) / lighting_arr.length : 0.5;
    lighting_arr = Array(NUM_SLOTS).fill(avg);
  }
  if (activity_arr.length !== NUM_SLOTS) {
    const avg = features.activity_score || (activity_arr.length > 0 ? activity_arr.reduce((a, b) => a + b, 0) / activity_arr.length : 0.5);
    activity_arr = Array(NUM_SLOTS).fill(avg);
  }

  // Static features (scalars)
  const camera = parseFloat(features.camera) || 0;
  const camera_score = Math.min(camera / 5, 1.0); // Normalize camera score (e.g., 5+ cameras is 1.0)

  const env = parseFloat(features.environment);
  const env_score = isNaN(env) ? 0.5 : env;

  for (let i = 0; i < NUM_SLOTS; i++) {
    const lighting_score = lighting_arr[i];
    const activity_score = activity_arr[i];

    // ---------- BASE WEIGHTED SCORE ----------
    let score = (
      0.45 * lighting_score +
      0.30 * activity_score +
      0.20 * camera_score +
      0.05 * env_score
    );

    // ---------- CONTEXTUAL PENALTIES ----------
    
    // Extreme Isolation (Low Lighting + Low Activity) -> Dangerous
    if (lighting_score < 0.2 && activity_score < 0.1) {
      score -= 0.3;
    }

    // Surveillance Blindspot (No Camera + Low Lighting) -> Risky
    if (camera_score === 0 && lighting_score < 0.3) {
      score -= 0.2;
    }

    // Total Abandonment (Zero Activity) -> Highly Dangerous
    if (activity_score === 0) {
      score -= 0.15;
    }

    // ---------- CLAMPING ----------
    score = Math.max(0.0, Math.min(1.0, score));
    
    // Rounded for storage efficiency
    scores.push(parseFloat(score.toFixed(4)));
  }

  return scores;
};

module.exports = computeSafetyScores;
