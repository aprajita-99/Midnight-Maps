import osmnx as ox
import networkx as nx
import json
import os

def generate_bangalore_graph():
    # Targeted center: Koramangala, Bangalore
    center_point = (12.9352, 77.6245)
    radius = 3000 # 3km radius
    
    print(f"Downloading targeted road network for Bangalore (3km radius around {center_point})...")
    # Download the road network for the specified point and radius
    try:
        G = ox.graph_from_point(center_point, dist=radius, network_type="drive")
    except Exception as e:
        print(f"Error downloading graph: {e}")
        return

    print(f"Graph loaded with {len(G.nodes)} nodes and {len(G.edges)} edges.")

    edges_data = []
    seen_segments = set()

    print("Extracting and deduplicating edges...")
    for u, v, data in G.edges(data=True):
        # Get coordinates of start (u) and end (v) nodes
        start_node = G.nodes[u]
        end_node = G.nodes[v]

        start_lat, start_lng = round(start_node['y'], 5), round(start_node['x'], 5)
        end_lat, end_lng = round(end_node['y'], 5), round(end_node['x'], 5)

        # Create a unique key for the segment
        coords = sorted([(start_lat, start_lng), (end_lat, end_lng)])
        segment_key = f"{coords[0][0]},{coords[0][1]}-{coords[1][0]},{coords[1][1]}"

        if segment_key not in seen_segments:
            seen_segments.add(segment_key)
            edges_data.append({
                "start": {"lat": start_lat, "lng": start_lng},
                "end": {"lat": end_lat, "lng": end_lng}
            })

    output_file = "bangalore_city_full.json"
    with open(output_file, 'w') as f:
        json.dump(edges_data, f, indent=2)

    print(f"Successfully saved {len(edges_data)} segments to {output_file}")

if __name__ == "__main__":
    generate_bangalore_graph()
