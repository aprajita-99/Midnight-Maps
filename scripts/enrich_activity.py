import requests
import json
import math
import os
import time
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
GOOGLE_MAPS_API_KEY = os.getenv("VITE_GOOGLE_MAPS_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI") or "mongodb://localhost:27017/night_navigator"
DB_NAME = "night_navigator"

# Configuration
API_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
RADIUS = 100  # meters
BATCH_SIZE = 100
COORDINATE_PRECISION = 5

# POI Category Weights
POI_CATEGORIES = {
    # High safety infrastructure (Always 1.0)
    "police": ("safety", 1.0),
    "hospital": ("safety", 1.0),
    "fire_station": ("safety", 1.0),
    "clinic": ("safety", 1.0),
    "health": ("safety", 1.0),
    "atm": ("safety", 1.0),
    "gas_station": ("safety", 1.0),

    # Medium activity (Time-dependent)
    "restaurant": ("dining", 0.6),
    "cafe": ("dining", 0.6),
    "fast_food": ("dining", 0.6),
    "bar": ("dining", 0.6),
    "night_club": ("dining", 0.6),

    # Low activity / retail (Time-dependent)
    "clothing_store": ("retail", 0.3),
    "supermarket": ("retail", 0.3),
    "convenience_store": ("retail", 0.3),
    "shopping_mall": ("retail", 0.3),
    "store": ("retail", 0.3),
    "pharmacy": ("retail", 0.3),
}

def get_time_factor(category, hour):
    """Business hours heuristic: returns activity multiplier for a given hour."""
    if category == "safety":
        return 1.0  # 24/7
    
    if category == "dining":
        # Peaks at lunch/dinner (7am-11pm)
        if 12 <= hour <= 14 or 19 <= hour <= 22:
            return 1.0
        if 7 <= hour <= 23:
            return 0.6
        return 0.1
        
    if category == "retail":
        # Normal retail hours (10am-9pm)
        if 10 <= hour <= 21:
            return 1.0
        return 0.05
    
    return 0.3 # Default for others

def get_lighting_profile(hour):
    """Simple lighting proxy: Day = 0, Night = High score for reliance on streetlights."""
    if 6 <= hour <= 18:
        return 0.0 # Daylight
    return 1.0 # Requires artificial lighting

# Global Session for performance and connection pooling
session = requests.Session()

def fetch_poi_data(lat, lng):
    """
    Fetch nearby POIs using Google Places Nearby Search API with robust retry logic.
    """
    if not GOOGLE_MAPS_API_KEY:
        print("CRITICAL ERROR: API Key missing!")
        return []

    params = {
        "location": f"{lat},{lng}",
        "radius": RADIUS,
        "key": GOOGLE_MAPS_API_KEY,
        "type": ",".join(POI_CATEGORIES.keys())
    }

    max_retries = 3
    backoff = 1  # seconds

    for attempt in range(max_retries):
        try:
            response = session.get(API_URL, params=params, timeout=10)
            data = response.json()
            
            status = data.get("status")
            if status == "ZERO_RESULTS":
                return []
            if status == "OVER_QUERY_LIMIT":
                print(f"Warning: Quota exceeded. Sleeping {backoff * 5}s...")
                time.sleep(backoff * 5)
                continue
            if status != "OK":
                print(f"API Warning: {status} - {data.get('error_message', 'No message')}")
                return []

            return data.get("results", [])

        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            print(f"Connection error (Attempt {attempt+1}/{max_retries}): {e}. Retrying in {backoff}s...")
            time.sleep(backoff)
            backoff *= 2 # Exponential backoff
        except Exception as e:
            print(f"Unexpected Fetch Error: {e}")
            return []

    return []

def compute_time_varying_scores(pois):
    """Calculates 12 activity scores (2hr slots) based on POI data and heuristics."""
    activity_profile = []
    lighting_profile = []
    
    # 12 slots: 0, 2, 4, ..., 22
    for slot in range(12):
        hour = slot * 2
        raw_slot_score = 0
        
        for poi in pois:
            # Determine category and weight
            cat, weight = "other", 0.3
            for poi_type in poi.get("types", []):
                if poi_type in POI_CATEGORIES:
                    cat, weight = POI_CATEGORIES[poi_type]
                    break
            
            # Apply time heuristic
            time_multiplier = get_time_factor(cat, hour)
            
            # Popularity scaling
            ratings = poi.get("user_ratings_total", 1)
            popularity = math.log(1 + ratings)
            
            raw_slot_score += (weight * time_multiplier * popularity)
        
        activity_profile.append(raw_slot_score)
        lighting_profile.append(get_lighting_profile(hour))
        
    return activity_profile, lighting_profile

def enrich_bangalore_pipeline():
    input_file = "bangalore_city_full.json"
    output_file = "bangalore_graph_with_activity.json"

    if not os.path.exists(input_file):
        print("HALTED: Input file missing.")
        return
    # STEP 1: Load Road Network
    with open(input_file, 'r') as f:
        edges = json.load(f)
    
    total_edges = len(edges)
    print(f"FULL ENRICHMENT: Processing all {total_edges} road segments for the targeted Bangalore sample...")

    processed_data = []
    poi_cache = {}

    for i, edge in enumerate(edges):
        lat1, lng1 = edge['start']['lat'], edge['start']['lng']
        lat2, lng2 = edge['end']['lat'], edge['end']['lng']
        mid_lat, mid_lng = (lat1 + lat2) / 2, (lng1 + lng2) / 2
        cache_key = (round(mid_lat, COORDINATE_PRECISION), round(mid_lng, COORDINATE_PRECISION))

        if cache_key in poi_cache:
            pois = poi_cache[cache_key]
        else:
            pois = fetch_poi_data(mid_lat, mid_lng)
            poi_cache[cache_key] = pois
            time.sleep(0.05)

        # Compute 12-point profiles
        activity_raw, lighting_profile = compute_time_varying_scores(pois)
        
        processed_data.append({
            "edge": edge,
            "activity_raw": activity_raw,
            "lighting": lighting_profile
        })

        if (i + 1) % 50 == 0:
            print(f"Processed {i + 1}/{total_edges} segments...")

    # Global Normalization across ALL segments and ALL time slots
    all_raw_activity = [val for p in processed_data for val in p["activity_raw"]]
    min_a = min(all_raw_activity) if all_raw_activity else 0
    max_a = max(all_raw_activity) if all_raw_activity else 0

    print(f"Global Activity Normalization: Min={min_a:.2f}, Max={max_a:.2f}")

    # Connect to MongoDB
    client = MongoClient(MONGODB_URI)
    db = client.get_database(DB_NAME)
    collection = db.road_segments
    bulk_updates = []

    final_json = []

    for item in processed_data:
        edge = item["edge"]
        raw_act = item["activity_raw"]
        
        # Normalize the activity array
        normalized_act = []
        for val in raw_act:
            norm = 0
            if max_a > min_a:
                norm = (val - min_a) / (max_a - min_a)
            normalized_act.append(round(norm, 4))
        
        # Store high-level average score for quick ranking
        avg_score = round(sum(normalized_act) / 12, 4)
        
        # Update edge for JSON export
        edge["activity_profile"] = normalized_act
        edge["lighting_profile"] = item["lighting"]
        edge["activity_score"] = avg_score
        final_json.append(edge)

        # Prepare MongoDB Document
        segment_id = f"{edge['start']['lat']},{edge['start']['lng']}-{edge['end']['lat']},{edge['end']['lng']}"
        doc = {
            "segment_id": segment_id,
            "start": edge["start"],
            "end": edge["end"],
            "midpoint": {
                "lat": (edge['start']['lat'] + edge['end']['lat']) / 2,
                "lng": (edge['start']['lng'] + edge['end']['lng']) / 2
            },
            "features": {
                "activity": normalized_act,
                "activity_score": avg_score,
                "lighting": item["lighting"],
                "crime": None,
                "environment": None
            }
        }

        bulk_updates.append(UpdateOne(
            {"segment_id": segment_id},
            {"$set": doc},
            upsert=True
        ))

    # Bulk Insert
    if bulk_updates:
        print(f"Syncing {len(bulk_updates)} documents with Time-Varying features...")
        result = collection.bulk_write(bulk_updates, ordered=False)
        print(f"DB Update Complete: {result.upserted_count} new, {result.modified_count} updated.")

    # Export JSON
    with open(output_file, 'w') as f:
        json.dump(final_json, f, indent=2)

    print("PIPELINE COMPLETE.")
    client.close()

if __name__ == "__main__":
    enrich_bangalore_pipeline()
