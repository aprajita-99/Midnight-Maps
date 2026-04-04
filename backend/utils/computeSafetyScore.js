/**
 * Computes a 12-slot array of safety scores (0.0 to 1.0) based on 4 features.
 * Represents 2-hour intervals for a full 24-hour cycle.
 */
function computeSafetyScores(features) {
  const scores = [];

  // Weight distribution (Must sum to 1.0)
  const WEIGHTS = {
    LIGHTING: 0.35,    // Visibility is paramount at night
    ACTIVITY: 0.35,    // "Eyes on the street" provides active deterrence
    ENVIRONMENT: 0.20, // Structural safety (openness vs isolation)
    CAMERA: 0.10       // Surveillance (Deterrent, but mostly reactive)
  };

  for (let t = 0; t < 12; t++) {
    // 1. Safely extract time-slot values (Fallback to 0.5 if data is missing/corrupted)
    const L = Array.isArray(features.lighting) ? (features.lighting[t] ?? 0.5) : (features.lighting ?? 0.5);
    const A = Array.isArray(features.activity) ? (features.activity[t] ?? 0.5) : (features.activity ?? 0.5);
    
    // Environment is usually static, but we check for arrays just in case
    const E = Array.isArray(features.environment) ? (features.environment[t] ?? 0.5) : (features.environment ?? 0.5);
    
    // Camera is already normalized (0-1)
    const C = Array.isArray(features.camera) ? (features.camera[t] ?? 0.5) : (features.camera ?? 0.5);

    // 2. Calculate Base Weighted Score
    let baseScore = (L * WEIGHTS.LIGHTING) + 
                    (A * WEIGHTS.ACTIVITY) + 
                    (E * WEIGHTS.ENVIRONMENT) + 
                    (C * WEIGHTS.CAMERA);

    // 3. The "Dark and Deserted" Penalty
    // If visibility is terrible AND nobody is around, the structural/camera benefits are negated.
    if (L < 0.3 && A < 0.3) {
      // Apply a severe 30% penalty
      baseScore *= 0.70; 
    } 
    // Minor penalty if it's just very dark
    else if (L < 0.3) {
      baseScore *= 0.85;
    }

    // 4. Time-of-Day Contextual Shift (Optional but realistic)
    // Between 12 AM (t=0) and 4 AM (t=1), human vulnerability is naturally higher. 
    // We cap the maximum possible safety score to 0.90 during these dead-of-night hours.
    if ((t === 0 || t === 1) && baseScore > 0.90) {
      baseScore = 0.90;
    }

    // 5. Clamp between 0.02 (absolute min) and 0.98 (absolute max) to keep UI curves smooth
    const finalScore = Math.max(0.02, Math.min(0.98, baseScore));

    scores.push(parseFloat(finalScore.toFixed(4)));
  }

  return scores;
}

module.exports = computeSafetyScores;
