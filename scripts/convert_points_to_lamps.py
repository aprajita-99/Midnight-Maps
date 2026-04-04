import json
import os

def convert():
    # Use relative paths from the root directory
    input_file = os.path.join('datasets', 'filtered_3_1km_points.json')
    output_file = os.path.join('datasets', 'koramangala_street_lamps_converted.json')

    if not os.path.exists(input_file):
        # Try lowercase or common variations if not found
        input_file = os.path.join('datasets', 'filtered_3_1km_points.json')
        if not os.path.exists(input_file):
            print(f"Error: Could not find {input_file}")
            return

    print(f"Loading data from {input_file}...")
    with open(input_file, 'r') as f:
        data = json.load(f)

    converted_data = []
    for item in data:
        # Map 'latitude' -> 'lat', 'longitude' -> 'lng' and add 'lit': true
        converted_data.append({
            "lat": item.get("latitude"),
            "lng": item.get("longitude"),
            "lit": True
        })

    print(f"Converting {len(data)} points...")
    
    with open(output_file, 'w') as f:
        json.dump(converted_data, f, indent=2)

    print(f"Success! Converted data saved to {output_file}")

if __name__ == "__main__":
    convert()
