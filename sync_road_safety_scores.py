import os
import sys
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from pymongo.errors import ConnectionFailure, BulkWriteError

def compute_safety_scores(features):
    NUM_SLOTS = 12
    scores = []

    # Safely extract arrays, defaulting to [0.5] * 12 if missing or not a list
    lighting_feat = features.get("lighting")
    activity_feat = features.get("activity")
    camera_score = features.get("camera")
    env_score = features.get("environment")
    
    lighting_arr = lighting_feat if isinstance(lighting_feat, list) else [0.5] * NUM_SLOTS
    activity_arr = activity_feat if isinstance(activity_feat, list) else [0.5] * NUM_SLOTS

    for i in range(NUM_SLOTS):
        lighting_score = lighting_arr[i]
        activity_score = activity_arr[i]

        # ---------- BASE WEIGHTED SCORE ----------
        score = (
            0.45 * lighting_score +
            0.30 * activity_score +
            0.20 * camera_score +
            0.05 * env_score
        )

        # ---------- CONTEXTUAL PENALTIES ----------
        
        # Extreme Isolation (Low Lighting + Low Activity) -> Dangerous
        if lighting_score < 0.2 and activity_score < 0.1:
            score -= 0.05

        # Surveillance Blindspot (No Camera + Low Lighting) -> Risky
        if camera_score == 0 and lighting_score < 0.3:
            score -= 0.03

        # ---------- CLAMPING ----------
        score = max(0.0, min(1.0, score))
        
        # Rounded for storage efficiency (to 4 decimal places)
        scores.append(round(score, 4))
    return scores

def sync_road_safety_scores():
    load_dotenv()
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/night_navigator")
    
    print("--- Safety Score Sync Started (Keyset Pagination) ---")
    print(f"Target URI: {mongodb_uri.split('@')[-1]}") 

    try:
        client = MongoClient(
            mongodb_uri,
            serverSelectionTimeoutMS=30000,
            socketTimeoutMS=45000
        )
        
        db_name = client.get_database().name if client.get_database().name else 'night_navigator'
        db = client[db_name]
        
        print(f"✅ Connected to Database: '{db_name}'\n")

        total_documents_in_db = db.road_segments.count_documents({})
        if total_documents_in_db == 0:
            print("\n❌ ERROR: Your database is completely empty!")
            sys.exit(1)

        print(f"🔍 DEBUG: Found exactly {total_documents_in_db} documents to process.\n")

        # --- THE FIX: Keyset Pagination ---
        print("🚀 Fetching segments in fresh ID-based batches (Atlas Free-Tier Safe)...")
        
        last_id = None
        batch_size = 1000
        total_processed = 0
        total_upserted = 0
        total_modified = 0

        while True:
            # Build the query: If we have a last_id, get documents AFTER it.
            query = {} if last_id is None else {"_id": {"$gt": last_id}}
            
            # Fetch a fresh batch of 1000 documents, sorted by _id
            batch_docs = list(db.road_segments.find(query).sort("_id", 1).limit(batch_size))
            
            # If the list is empty, we have processed the entire city!
            if not batch_docs:
                break

            operations = []
            
            for seg in batch_docs:
                # Track the _id so the next batch knows where to start
                last_id = seg["_id"]
                
                features = seg.get("features", {})
                scores = compute_safety_scores(features)
                
                # Build the Upsert operation
                op = UpdateOne(
                    {"segment_id": seg.get("segment_id")},
                    {"$set": {
                        "segment_id": seg.get("segment_id"),
                        "start": seg.get("start"),
                        "end": seg.get("end"),
                        "midpoint": seg.get("midpoint"),
                        "location": seg.get("location"),
                        "scores": scores
                    }},
                    upsert=True
                )
                operations.append(op)

            # Execute bulk write for this specific batch
            if operations:
                result = db.scored_segments.bulk_write(operations)
                total_upserted += result.upserted_count
                total_modified += result.modified_count
                total_processed += len(operations)
                
                print(f"⏳ Processed {total_processed} / {total_documents_in_db} segments...")

        print("\n✅ --- Final Sync Results ---")
        print(f"Total Processed:  {total_processed}")
        print(f"Newly Created:    {total_upserted}")
        print(f"Updated Existing: {total_modified}")
        print("-" * 30)
        print("\nMigration complete! Atlas timeouts successfully bypassed.")
        
    except Exception as e:
        print(f"\n❌ [FATAL ERROR]: {str(e)}")
        sys.exit(1)
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    sync_road_safety_scores()