import requests
import json
import os
import time

def fetch_surveillance_cameras():
    url = "https://overpass-api.de/api/interpreter"
    
    # Query for cameras tagged with man_made=surveillance 
    # within 3km radius of Koramangala Center (12.9352, 77.6245)
    query = """
    [out:json];
    (
      node["man_made"="surveillance"](around:3000,12.9352,77.6245);
    );
    out body;
    """
    
    print("Fetching surveillance camera data from Overpass API (Koramangala, 3km radius)...")
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params={"data": query}, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                cameras = []
                
                elements = data.get("elements", [])
                for element in elements:
                    if "lat" in element and "lon" in element:
                        tags = element.get("tags", {})
                        cameras.append({
                            "lat": element["lat"],
                            "lng": element["lon"],
                            "type": tags.get("surveillance:type", "unknown")
                        })
                
                output_file = "koramangala_cameras.json"
                with open(output_file, "w") as f:
                    json.dump(cameras, f, indent=2)
                
                print(f"Successfully saved {len(cameras)} surveillance cameras to {output_file}.")
                return
            
            elif response.status_code == 429:
                print(f"Rate limited (429). Retrying in 10s... (Attempt {attempt+1}/{max_retries})")
                time.sleep(10)
            else:
                print(f"API Error ({response.status_code}): {response.text}")
                break
                
        except Exception as e:
            print(f"Connection error: {e}. Retrying in 5s... (Attempt {attempt+1}/{max_retries})")
            time.sleep(5)
            
    print("Failed to fetch camera data after multiple attempts.")

if __name__ == "__main__":
    fetch_surveillance_cameras()
