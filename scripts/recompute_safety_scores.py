import os
import json
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = "night_navigator"

def compute_safety_scores(features):
    """
    Python implementation of the 12-slot safety scoring logic 
    from computeSafetyScore.js.
    """
    scores = []
    
    # Weight distribution (Must sum to 1.0)
    WEIGHTS = {
        'LIGHTING': 0.35,
        'ACTIVITY': 0.35,
        'ENVIRONMENT': 0.20,
        'CAMERA': 0.10
    }
    
    # Extract features
    lighting_arr = features.get("lighting", [0.5] * 12)
    activity_arr = features.get("activity", [0.5] * 12)
    env_val = features.get("environment", 0.5)
    cam_val = features.get("camera", 0.5)
    
    # Handle environment/camera if they are accidentally arrays or single values
    def get_val(val, idx):
        if isinstance(val, list):
            return val[idx] if idx < len(val) else 0.5
        return val

    for t in range(12):
        # 1. Extract time-slot values
        L = lighting_arr[t] if isinstance(lighting_arr, list) and t < len(lighting_arr) else 0.5
        A = activity_arr[t] if isinstance(activity_arr, list) and t < len(activity_arr) else 0.5
        E = get_val(env_val, t)
        C = get_val(cam_val, t)
        
        # 2. Calculate Base Weighted Score
        base_score = (L * WEIGHTS['LIGHTING']) + \
                     (A * WEIGHTS['ACTIVITY']) + \
                     (E * WEIGHTS['ENVIRONMENT']) + \
                     (C * WEIGHTS['CAMERA'])
        
        # 3. Penalties
        # "Dark and Deserted" (30% penalty)
        if L < 0.3 and A < 0.3:
            base_score *= 0.70
        # "Dark" (15% penalty)
        elif L < 0.3:
            base_score *= 0.85
            
        # 4. Time-of-Day Contextual Shift (Slot 0 & 1 = 12 AM - 4 AM)
        if (t == 0 or t == 1) and base_score > 0.90:
            base_score = 0.90
            
        # 5. Clamp between 0.02 and 0.98
        final_score = max(0.02, min(0.98, base_score))
        
        scores.append(round(final_score, 4))
        
    return scores

def recompute_pipeline():
    if not MONGODB_URI:
        print("Error: MONGODB_URI not found in .env")
        return

    client = MongoClient(MONGODB_URI)
    db = client.get_database(DB_NAME)
    road_col = db.road_segments
    scored_col = db.scored_segments
    
    print("Beginning recompute pipeline...")
    
    batch_size = 500
    updates = []
    processed_count = 0
    
    try:
        # Fetch all road segments
        cursor = road_col.find({})
        
        for doc in cursor:
            segment_id = doc.get("segment_id")
            if not segment_id:
                continue
                
            features = doc.get("features", {})
            new_scores = compute_safety_scores(features)
            
            # Prepare the scored segment document
            # We copy some metadata for visualization efficiency in UI
            scored_doc = {
                "segment_id": segment_id,
                "start": doc.get("start"),
                "end": doc.get("end"),
                "midpoint": doc.get("midpoint"),
                "location": doc.get("location"),
                "scores": new_scores
            }
            
            updates.append(UpdateOne(
                {"segment_id": segment_id},
                {"$set": scored_doc},
                upsert=True
            ))
            
            processed_count += 1
            if len(updates) >= batch_size:
                print(f"Syncing batch... Processed {processed_count} segments.")
                scored_col.bulk_write(updates, ordered=False)
                updates = []
                
        # Execute final batch
        if updates:
            scored_col.bulk_write(updates, ordered=False)
            print(f"Final batch synced. Total processed: {processed_count}")
            
        print("RECOMPUTE PIPELINE COMPLETE: scored_segments collection is up to date.")
        
    except Exception as e:
        print(f"Error during recompute: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    recompute_pipeline()
