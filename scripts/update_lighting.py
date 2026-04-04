import json
import os
import math
import numpy as np
from scipy.spatial import KDTree
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI") or "mongodb://localhost:27017/night_navigator"
DB_NAME = "night_navigator"

def meters_to_degrees(meters):
    """Approximate conversion: 1 degree latitude is ~111km."""
    return meters / 111000.0

def update_lighting_pipeline():
    lamp_file = "koramangala_street_lamps.json"
    if not os.path.exists(lamp_file):
        print(f"PIPELINE HALTED: {lamp_file} not found. Please run fetch_street_lamps.py first.")
        return

    # STEP 1: Load Street Lamp Dataset
    print(f"Loading street lamp data from {lamp_file}...")
    with open(lamp_file, 'r') as f:
        lamp_data = json.load(f)
    
    # Extract coordinates for KD-Tree
    lamp_points = np.array([[l["lat"], l["lng"]] for l in lamp_data])
    
    if len(lamp_points) == 0:
        print("PIPELINE HALTED: No lamp coordinates found in dataset.")
        return

    # STEP 2: Build KD-Tree (Fast O(N log N) initialization)
    print(f"Building KD-Tree for {len(lamp_points)} lamps...")
    tree = KDTree(lamp_points)

    # STEP 3: MongoDB Setup
    client = MongoClient(MONGODB_URI)
    db = client.get_database(DB_NAME)
    collection = db.road_segments

    # STEP 4: Process Documents in Batches
    print("Beginning MongoDB batch processing...")
    
    batch_size = 500
    updates = []
    processed_count = 0
    radius_deg = meters_to_degrees(30) # 30 meters search radius

    try:
        # Fetch all segments to update
        cursor = collection.find({}, batch_size=batch_size)
        
        for doc in cursor:
            segment_id = doc.get("segment_id")
            midpoint = doc.get("midpoint")
            
            if not segment_id or not midpoint:
                continue

            # STEP 5: Query Nearby Lamps using KD-Tree (Fast O(log N) lookup)
            mid_lat = midpoint["lat"]
            mid_lng = midpoint["lng"]
            
            # Find indices of lamps within 30m
            indices = tree.query_ball_point([mid_lat, mid_lng], radius_deg)
            lamp_count = len(indices)

            # STEP 6: Compute Lamp-based Lighting Score
            # Assuming 5 lamps within 30m is "Full Lighting" (1.0)
            lamp_score = min(1.0, lamp_count / 5.0)

            # STEP 7: Compute Time-Varying Lighting Array (12 slots)
            activity_array = doc.get("features", {}).get("activity", [0.0] * 12)
            lighting = [0.0] * 12

            for t in range(12):
                hour = t * 2
                
                # Day vs Night logic
                # DAY: 6 AM to 6 PM (Slots 3, 4, 5, 6, 7, 8)
                if 6 <= hour < 18:
                    lighting[t] = 1.0 # Sunlight contributes full lightness
                else:
                    # NIGHT: Hybrid of lamps and business activity (shops/dining)
                    activity_at_time = activity_array[t] if t < len(activity_array) else 0
                    
                    # 70% Weight on Street Lamps, 30% Weight on Business Presence
                    night_score = (0.7 * lamp_score) + (0.3 * activity_at_time)
                    lighting[t] = min(1.0, round(night_score, 4))

            # STEP 8 & 9: Prepare Bulk Update
            updates.append(UpdateOne(
                {"segment_id": segment_id},
                {"$set": {"features.lighting": lighting}}
            ))

            processed_count += 1
            if len(updates) >= batch_size:
                print(f"Syncing batch... Processed {processed_count} segments.")
                collection.bulk_write(updates, ordered=False)
                updates = []

        # Execute final remaining batch
        if updates:
            collection.bulk_write(updates, ordered=False)
            print(f"Final batch synced. Total processed: {processed_count}")

        print("PIPELINE COMPLETE: All segments updated with high-resolution lighting data.")

    except Exception as e:
        print(f"Critical error during pipeline processing: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    update_lighting_pipeline()
