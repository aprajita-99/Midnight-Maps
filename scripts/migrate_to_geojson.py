import os
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI") or "mongodb://localhost:27017/night_navigator"
DB_NAME = "night_navigator"

def migrate_to_geojson():
    client = MongoClient(MONGODB_URI)
    db = client.get_database(DB_NAME)
    collection = db.road_segments

    print("Fetching documents to migrate midpoint to GeoJSON 'location'...")
    cursor = collection.find({ "location": { "$exists": False } })
    
    bulk_updates = []
    processed_count = 0

    for doc in cursor:
        midpoint = doc.get("midpoint")
        if not midpoint:
            continue
            
        lat = midpoint.get("lat")
        lng = midpoint.get("lng")
        
        if lat is None or lng is None:
            continue

        # GeoJSON is [longitude, latitude]
        location = {
            "type": "Point",
            "coordinates": [lng, lat]
        }
        
        bulk_updates.append(UpdateOne(
            { "_id": doc["_id"] },
            { "$set": { "location": location } }
        ))
        
        processed_count += 1
        if len(bulk_updates) >= 500:
            print(f"Migrating batch... Processed {processed_count}")
            collection.bulk_write(bulk_updates, ordered=False)
            bulk_updates = []

    if bulk_updates:
        collection.bulk_write(bulk_updates, ordered=False)
        print(f"Final batch migrated. Total: {processed_count}")

    # Explicitly ensure the 2dsphere index exists
    print("Ensuring 2dsphere index on 'location'...")
    collection.create_index([("location", "2dsphere")])
    
    print("MIGRATION COMPLETE.")
    client.close()

if __name__ == "__main__":
    migrate_to_geojson()
