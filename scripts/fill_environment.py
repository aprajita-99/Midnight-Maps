import torch
from torchvision import models, transforms
from PIL import Image
import requests
import io
import math
from pymongo import MongoClient

# =========================
# 🔑 CONFIG
# =========================
GOOGLE_API_KEY = "api-key"
MONGO_URI = "database - link"
DB_NAME = "db_name"
COLLECTION_NAME = "road_segments"

# =========================
# 🧠 LOAD PLACES365 MODEL
# =========================
model = models.resnet50(num_classes=365)
checkpoint = torch.load('model link', map_location='cpu')
state_dict = {k.replace('module.', ''): v for k, v in checkpoint['state_dict'].items()}
model.load_state_dict(state_dict)
model.eval()

classes = []
try:
    with open('categories link') as f:
        # Robust parsing: handles formatting variations
        for line in f:
            parts = line.strip().split(' ')
            if len(parts) >= 1:
                label = parts[0]
                if label.startswith('/'):
                    label = label[3:] # Remove the '/a/' part
                classes.append(label)
except Exception as e:
    print(f"⚠️ Error loading categories: {e}")

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# =========================
# 🌍 DYNAMIC SCENE SCORING
# =========================
def get_robust_scene_score(predictions):
    """
    Calculates safety based on the SUM of probabilities of human-centric areas.
    """
    safe_labels = [
        'apartment_building', 'bakery', 'balcony', 'bank_vault', 'bar', 'bazaar', 
        'beauty_salon', 'bedroom', 'beer_garden', 'bookstore', 'bus_station', 
        'butchers_shop', 'cafeteria', 'campus', 'candy_store', 'childs_room', 
        'church', 'classroom', 'clothing_store', 'coffee_shop', 'conference_room', 
        'courthouse', 'courtyard', 'crosswalk', 'delicatessen', 'department_store', 
        'dining_room', 'dorm_room', 'downtown', 'drugstore', 'fastfood_restaurant', 
        'fire_station', 'food_court', 'gas_station', 'general_store', 'hospital', 
        'hotel', 'house', 'ice_cream_parlor', 'jewelry_shop', 'kindergarden', 
        'kitchen', 'laundromat', 'library', 'living_room', 'lobby', 'market', 
        'nursery', 'nursing_home', 'office', 'pizzeria', 'playground', 'plaza', 
        'police_station', 'reception', 'residential_neighborhood', 'restaurant', 
        'schoolhouse', 'shopfront', 'shopping_mall', 'sidewalk', 'skyscraper', 
        'street', 'supermarket', 'toyshop', 'train_station', 'village', 'youth_hostel'
    ]
    
    isolated_labels = [
        'badlands', 'bamboo_forest', 'bayou', 'canyon', 'catacomb', 'cemetery', 
        'cliff', 'crevasse', 'desert', 'forest', 'glacier', 'grotto', 'iceberg', 
        'islet', 'jungle', 'marsh', 'mountain', 'ocean', 'rainforest', 'ruin', 
        'swamp', 'trench', 'tundra', 'underwater', 'volcano', 'waterfall'
    ]

    safe_sum = 0.0
    isolated_sum = 0.0

    # This is where the unpacking error happened. Now 'predictions' is guaranteed to be a list of tuples.
    for label, prob in predictions:
        clean_label = label.lower().split('/')[-1]
        
        if any(match in clean_label for match in safe_labels):
            safe_sum += prob
        elif any(match in clean_label for match in isolated_labels):
            isolated_sum += prob

    print(f"   📊 Signals -> [Safe Sum: {safe_sum:.3f} | Isolated Sum: {isolated_sum:.3f}]")

    # --- FINAL SCORE CALCULATION ---
    if safe_sum > 0.3:
        final_score = min(0.98, 0.3 + safe_sum)
    elif isolated_sum > 0.30:
        final_score = max(0.02, 1.0 - isolated_sum - 0.3)
    else:
        final_score = max(0.05, min(0.95, 0.5 - (isolated_sum * 0.5) + (safe_sum * 0.5)))

    return round(final_score, 4)

# =========================
# 📸 FETCH STREET VIEW IMAGE
# =========================
def get_street_view_image(lat, lng):
    url = f"https://maps.googleapis.com/maps/api/streetview"
    params = {
        "size": "400x400",
        "location": f"{lat},{lng}",
        "key": GOOGLE_API_KEY
    }
    response = requests.get(url, params=params)
    if response.status_code != 200:
        return None
    return Image.open(io.BytesIO(response.content)).convert("RGB")

# =========================
# 🧮 COMPUTE ENV SCORE
# =========================
def compute_env_score(image):
    input_img = transform(image).unsqueeze(0)
    with torch.no_grad():
        output = model(input_img)
        probs = torch.nn.functional.softmax(output, dim=1)

    top5_prob, top5_idx = probs.topk(5)

    # We must build a list of tuples to pass to get_robust_scene_score
    predictions = []
    print("\n   --- AI Vision Output ---")
    
    for i in range(5):
        # Prevent index out of bounds if classes loaded weirdly
        idx = top5_idx[0][i].item()
        label = classes[idx] if idx < len(classes) else "unknown"
        prob = top5_prob[0][i].item()
        
        predictions.append((label, prob))
        
        if i < 3: 
            print(f"   | {label}: {prob*100:.1f}% confidence")
            
    # Send the list of tuples to our scoring function
    return get_robust_scene_score(predictions)

# =========================
# 📍 MIDPOINT FUNCTION
# =========================
def get_midpoint(start, end):
    return {
        "lat": (start["lat"] + end["lat"]) / 2,
        "lng": (start["lng"] + end["lng"]) / 2
    }

# =========================
# 🔄 PROCESS SEGMENTS
# =========================
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

print("🚀 Starting AI Safety Scoring Pipeline...")
segments = collection.find({})

for segment in segments:
    try:
        start = segment["start"]
        end = segment["end"]
        midpoint = get_midpoint(start, end)

        # Fetch image
        image = get_street_view_image(midpoint["lat"], midpoint["lng"])
        if image is None:
            print(f"⚠️ Skipping {segment.get('segment_id', 'Unknown')} (no image retrieved)")
            continue

        # Compute score
        env_score = compute_env_score(image)

        # Update DB
        collection.update_one(
            {"_id": segment["_id"]},
            {"$set": {"features.environment": env_score}}
        )

        print(f"✅ Updated {segment.get('segment_id')} → Final Safety Score: {env_score:.3f}")
        print("-" * 40)

    except Exception as e:
        print(f"❌ Error in segment {segment.get('segment_id')}: {e}")

print("🎉 ALL SEGMENTS PROCESSED AND SCORED!")