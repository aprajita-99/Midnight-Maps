import requests
import json
import os
import time

def fetch_street_lamps():
    url = "https://overpass-api.de/api/interpreter"
    
    # Query for nodes tagged with highway=street_lamp 
    # within 3km radius of Koramangala Center (12.9352, 77.6245)
    query = """
    [out:json];
    (
      node["highway"="street_lamp"](around:3000,12.9352,77.6245);
    );
    out body;
    """
    
    print("Fetching street lamp data from Overpass API (Koramangala, 2.5km radius)...")
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params={"data": query}, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                lamps = []
                
                elements = data.get("elements", [])
                for element in elements:
                    if "lat" in element and "lon" in element:
                        lamps.append({
                            "lat": element["lat"],
                            "lng": element["lon"],
                            "lit": True
                        })
                
                output_file = "koramangala_street_lamps.json"
                with open(output_file, "w") as f:
                    json.dump(lamps, f, indent=2)
                
                print(f"Successfully saved {len(lamps)} street lamps to {output_file}.")
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
            
    print("Failed to fetch street lamp data after multiple attempts.")

if __name__ == "__main__":
    fetch_street_lamps()
