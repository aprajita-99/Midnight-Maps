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

def meters_to_degrees(m):
    return m / 111000.0

def haversine_dist(lat1, lon1, lat2, lon2):
    # Simple Euclidean approx for short distances (<1km)
    dx = (lon2 - lon1) * math.cos(math.radians(lat1))
    dy = lat2 - lat1
    return math.sqrt(dx*dx + dy*dy) * 111000

def update_camera_pipeline():
    camera_file = "koramangala_cameras.json"
    if not os.path.exists(camera_file):
        print(f"Error: {camera_file} not found.")
        return

    print(f"Loading camera data...")
    with open(camera_file, 'r') as f:
        camera_data = json.load(f)
    
    camera_points = np.array([[c["lat"], c["lng"]] for c in camera_data])
    if len(camera_points) == 0:
        print("No cameras found.")
        return

    print(f"Building KD-Tree for {len(camera_points)} cameras...")
    tree = KDTree(camera_points)

    client = MongoClient(MONGODB_URI)
    db = client.get_database(DB_NAME)
    collection = db.road_segments

    print("Fetching segments and computing raw scores...")
    segments = list(collection.find({}))
    raw_scores = []
    radius_deg = meters_to_degrees(100) # 100m influence radius

    for seg in segments:
        midpoint = seg.get("midpoint")
        if not midpoint: continue
        
        m_lat, m_lng = midpoint["lat"], midpoint["lng"]
        indices = tree.query_ball_point([m_lat, m_lng], radius_deg)
        
        score = 0
        for idx in indices:
            c_lat, c_lng = camera_points[idx]
            d = haversine_dist(m_lat, m_lng, c_lat, c_lng)
            # Exponential decay: influence drops by 63% every 50 meters
            score += math.exp(-d / 50.0)
        
        raw_scores.append((seg["segment_id"], score))

    # Normalize
    if raw_scores:
        scores_only = [s[1] for s in raw_scores]
        min_s, max_s = min(scores_only), max(scores_only)
        
        print(f"Normalizing... Min: {min_s:.4f}, Max: {max_s:.4f}")
        
        bulk_updates = []
        for segment_id, score in raw_scores:
            norm_score = 0
            if max_s > min_s:
                norm_score = (score - min_s) / (max_s - min_s)
            
            bulk_updates.append(UpdateOne(
                {"segment_id": segment_id},
                {"$set": {"features.camera": round(norm_score, 4)}}
            ))

        if bulk_updates:
            print(f"Syncing {len(bulk_updates)} segments to MongoDB...")
            collection.bulk_write(bulk_updates, ordered=False)

    print("CAMERA PIPELINE COMPLETE.")
    client.close()

if __name__ == "__main__":
    update_camera_pipeline()
