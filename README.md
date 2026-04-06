

# Midnight Maps
### *Midnight Maps — AI-Powered Safety Navigation for the Night*

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Google Maps](https://img.shields.io/badge/Google%20Maps-API-4285F4?style=for-the-badge&logo=google-maps&logoColor=white)](https://developers.google.com/maps)
[![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![ResNet](https://img.shields.io/badge/ResNet-CNN_Model-000000?style=for-the-badge)]()
[![Computer Vision](https://img.shields.io/badge/Computer%20Vision-ResNet--Based-blue?style=for-the-badge)]()

---

<img width="1919" height="948" alt="Screenshot 2026-04-06 014037" src="https://github.com/user-attachments/assets/4cd5afc3-365f-4603-a09d-519b8e8792bd" />



**A comprehensive full-stack navigation platform that scores every road segment for night-time safety using infrastructure data (street lighting + CCTV coverage), ambient activity patterns, and a live Reinforcement Learning feedback loop — so your route suggestions actually improve the more people use it.**

<p align="center">
  <a href="https://midnight-maps.vercel.app"><b>🌍 Try Live App</b></a> &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="https://youtu.be/AAlChO91CCU"><b>📺 Watch Demo</b></a> &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#getting-started"><b>💻 Run on Local Machine</b></a>
</p>

---

</div>

##  The Problem

Existing navigation apps (Google Maps, Apple Maps) optimize **purely for speed**. They don't know:

- Whether a street is lit at 2 AM
- Whether there are CCTV cameras providing passive surveillance
- Whether foot traffic makes the area feel safe
- Whether the route passes through isolated underpasses or dead-ends

**Midnight Maps** fills this gap by building a city-wide **safety graph** on top of OpenStreetMap road data, enriched with real CCTV camera positions, street lamp data, and user feedback, then using a **Reinforcement Learning agent** to continuously improve its scoring model.

---
## Midnight Maps - Landing Page
<img width="1919" height="994" alt="image" src="https://github.com/user-attachments/assets/874c047a-6e7a-49ee-a643-3fce1894fa6f" />

---

##  Feature Showcase

# Route Ranking based on Safety

Three routes are compared simultaneously and ranked as **Safest**, **Balanced**, or **Fastest**—backed by real-time safety computation.

<table>
  <tr>
    <td width="30%" valign="top" rowspan="2">
      <img src="https://github.com/user-attachments/assets/cbebe8c5-1384-43f6-a4d2-460a89e04cce" alt="Safety Interface" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
    </td>
    <td width="70%" valign="top">
      <h3>Scoring Logic</h3>
      <p>Routes are processed through a multi-factor function that adjusts dynamically based on environmental shifts:</p>
      <code>Route Score = f(Lighting, Surveillance, Activity, Environment)</code><br>
      <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;× Time-of-Day Weights × Dark & Deserted Penalty</code>
      <br><br>
      <table>
        <thead>
          <tr>
            <th>Badge</th>
            <th>Optimization Formula</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>🟢 <b>Safest</b></td>
            <td><code>meanSafety × 0.7 + minScore × 0.3</code></td>
          </tr>
          <tr>
            <td>🔵 <b>Balanced</b></td>
            <td><code>meanSafety - (timePenalty × 0.75)</code></td>
          </tr>
          <tr>
            <td>🟡 <b>Fastest</b></td>
            <td><code>min(travel_duration)</code></td>
          </tr>
        </tbody>
      </table>
    </td>
  </tr>
  <tr>
  </tr>
</table>

---
###  CCTV Camera Overlay

<p align="center" style="display: flex; justify-content: space-between;">
  <img src="https://github.com/user-attachments/assets/728df678-901f-46e0-93d3-17e0fbc821c6" width="49%" alt="Day Mode CCTV Overlay" style="border-radius: 8px; box-shadow: 0px 4px 10px rgba(0,0,0,0.15);">
  <img src="https://github.com/user-attachments/assets/bb8c6519-758e-4d25-8446-1ee1cbf497e1" width="49%" alt="Night Mode CCTV Overlay" style="border-radius: 8px; box-shadow: 0px 4px 10px rgba(0,0,0,0.15);">
</p>

This Toggle button shows an overlay of all the cameras present in the region according to our dataset , For users the cameras can be shown in their Proximity (eg: ALL cameras within 50 m radius ) , but currently all the cameras are shown to validate how correctly our algorithm measures safety based on the cameras present.

#####  How CCTV Influences Safety Scores

Camera presence applies a dynamic **×1.35 multiplier** to the raw camera feature value (capped at a maximum of `1.0`).
Because visibility is more critical after dark, this score carries different weights depending on the time of day.

DAY - 10 %
NIGHT - 15 %

**The Calculation:**
```text
C_final = min(1.0, C_raw × 1.35)
```
---

###  Street Lamp Overlay

<p align="center" style="display: flex; justify-content: space-between;">
  <img src="https://github.com/user-attachments/assets/2913f499-ad2d-4c04-908c-074dfe2be2b1" width="49%" alt="Day Mode CCTV Overlay" style="border-radius: 8px; box-shadow: 0px 4px 10px rgba(0,0,0,0.15);">
  <img src="https://github.com/user-attachments/assets/1f5f83eb-f52a-4f5a-9f09-3aa72a4c4534" width="49%" alt="Night Mode CCTV Overlay" style="border-radius: 8px; box-shadow: 0px 4px 10px rgba(0,0,0,0.15);">
</p>

Toggling the **street lighting layer** shows amber dot markers at every recorded lamp position from `koramangala_street_lamps.json` file. Currently this is done to demonstrate how the lightness and the safety scores are influenced by the street lamps present . Later for users , the lamps can be shown in their proximity or on their navigating path.

**Why lighting is critical at night:** At night, lighting carries **40% weight** in the safety formula.
A `lighting < 0.3` triggers an additional **15–30% penalty** on the base score.

---

### Route Intelligence Panel

After the route analysis is complete, a collapsible **Route Intelligence** panel provides a transparent breakdown of exactly why a route received its safety score.

<table>
  <tr>
    <td width="35%" valign="top">
      <img src="https://github.com/user-attachments/assets/1048efbf-0f45-41d7-a381-434f97fce5cf" alt="Route Intelligence Panel" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: 100%;">
    </td>
    <td width="65%" valign="top">
      <h4>Nighttime Scoring Weights</h4>
      <p>The algorithm adapts its weighting based on the time of day. Below is the breakdown for nighttime routing:</p>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Data Source</th>
            <th>Weight (Night)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td> <b>Lighting</b></td>
            <td><code>features.lighting[timeSlot]</code></td>
            <td><b>40%</b></td>
          </tr>
          <tr>
            <td> <b>Surveillance</b></td>
            <td><code>features.camera × 1.35</code></td>
            <td><b>15%</b></td>
          </tr>
          <tr>
            <td><b>Activity</b></td>
            <td><code>features.activity[timeSlot]</code></td>
            <td><b>25%</b></td>
          </tr>
          <tr>
            <td><b>Context</b></td>
            <td><code>features.environment</code></td>
            <td><b>20%</b></td>
          </tr>
        </tbody>
      </table>
      <p align="right"><small><i>Weights shift dynamically during daylight hours to prioritize activity and environment over lighting.</i></small></p>
    </td>
  </tr>
</table>

---

###  Map Overlay icons

The routing interface features a robust set of toggleable map layers on the right-hand panel. This allows users to visualize the exact environmental data driving their route's safety score.


| Control  | Overlay Layer | Description & Routing Impact |
| :---: | :--- | :--- |
| <img src="https://github.com/user-attachments/assets/9307ba08-9cad-4416-9db5-01dd0e5706c8" alt="Placeholder: Base Map" width="30" height="30"> | **Base Map** | Toggles satellite imagery . |
| <img src="https://github.com/user-attachments/assets/0d80e6aa-c843-4114-aacd-6a5ea44c5e01" alt="Placeholder: Traffic" width="30" height="30"> | **Traffic** | Shows Traffic layer . |
| <img src="https://github.com/user-attachments/assets/22f05414-2b43-4732-b401-b0f288509855" alt="Placeholder: open shops" width="30" height="30"> | **Open shops and Police Nearby** | Displays Nearby open shops and Police Station nearby so users can feel safe on night streets. |
| <img src="https://github.com/user-attachments/assets/ec917a5d-de8d-4d89-ac62-a99a3bde2d19" alt="Placeholder: cameras" width="30" height="30"> | **Show Cameras** | Overlays the map with cameras present |
| <img src="https://github.com/user-attachments/assets/e43a2fbb-246a-445d-a73a-842313f3a1b5" alt="Placeholder: Lamps" width="30" height="30"> | **Show Lamps** | Overlays the map with Lamps present |
| <img src="https://github.com/user-attachments/assets/902b7167-785e-4635-b36f-e75c25faf67e" alt="Placeholder: Midnight Toggle" width="30" height="30"> | **Midnight Toggle ** | This Toggles the current time to midnight so that users can inspect the safety in a night environment , also Needed for demonstration purposes |
| <img src="https://github.com/user-attachments/assets/32838f6e-2ac5-4b6f-9d2d-7f9a0e8b2fc2" alt="Placeholder: Location" width="30" height="30"> | **Show My location** | On toggling Users current location is shown |
| <img src="https://github.com/user-attachments/assets/a9780c77-598d-417d-b64c-5a7a6d228e2f" alt="Placeholder: StreetView" width="30" height="30"> | **Street View Pegman** | Users can drag and drop to see street views |
| <img src="https://github.com/user-attachments/assets/ae1861a7-d43d-4036-bab5-5342efd644a2" alt="Placeholder: safety inspector" width="30" height="30"> | **Safety Inspector** | Shows all the safety metrics of a street |

---

### Safety Inspector (Street-Level)

<table>
  <tr>
    <td width="40%" valign="top">
      <img src="https://github.com/user-attachments/assets/0c9f1f09-1552-4ca5-932a-839eabefa72d" alt="Safety Inspector View 1" style="border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); margin-bottom: 15px; width: 100%;">
      <img src="https://github.com/user-attachments/assets/78573bf6-580f-466c-a90a-10fb4632b610" alt="Safety Inspector View 2" style="border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); width: 100%;">
    </td>
    <td width="60%" valign="top">
      <h4>Deep Dive into Segment Data</h4>
      <p>The <b>Safety Inspector</b> mode empowers users to interrogate any individual road segment directly on the map. Instantly retrieve raw safety metrics without ever leaving your navigation flow.</p>
      <hr>
      <h5>Instant Safety Metrics Shown:</h5>
      <ul>
        <li> <b>Lighting Profile:</b> View current illumination levels and identify potential dark zones.</li>
        <li> <b>Camera Coverage:</b> Verify the density of active surveillance and CCTV presence.</li>
        <li> <b>Activity Profile:</b> Check live foot traffic.</li>
        <li> <b>Environment Context:</b> See Whether the street is in residential safe area or isolated empty area.</li>
      </ul>
      <br>
      <blockquote>
        <i> The images here show how lighting is affected by the presence of street lamps , both the images are of night time hence low lighting score </i>
      </blockquote>
    </td>
  </tr>
</table>

------

###  Navigation Simulation

**Note on Simulation:** This feature was built specifically for the hackathon environment. Because I cannot practically field test routing over roads at night, so I built this simulation engine. It allows users and judges to experience the full navigation flow, UI transformations, and post-trip Reinforcement Learning feedback loop directly from their browser.

<img width="1919" height="1079" alt="Screenshot 2026-04-06 015559" src="https://github.com/user-attachments/assets/96a4355d-a9dc-4c22-8aca-0088c2530d99" />

A full route simulation engine drives a marker along the selected route at configurable speed (default 12 m/s ≈ 43 km/h). During simulation:

- The map **rotates and tilts** with vehicle heading (60° tilt on vector-enabled maps)
- A **Navigation HUD** shows turn-by-turn instructions with distance countdowns
- The sidebar collapses for an immersive full-screen experience
- On completion, a **Trip Summary Modal** collects segment-level feedback
- There is option to see nearby open shops and police stations while navigating , so that users can feel safe.

---

###  Google Street View Integration

<p align="center" style="display: flex; justify-content: space-between;">
  <img src="https://github.com/user-attachments/assets/ba400fa6-2ac1-4f20-9e3d-6935219c923c" width="49%" alt="Day Mode CCTV Overlay" style="border-radius: 8px; box-shadow: 0px 4px 10px rgba(0,0,0,0.15);">
  <img src="https://github.com/user-attachments/assets/3df8f28f-ff14-4ae9-b161-a1c5b713ba32" width="49%" alt="Night Mode CCTV Overlay" style="border-radius: 8px; box-shadow: 0px 4px 10px rgba(0,0,0,0.15);">
</p>

A **Pegman control** lets users drop into Street View panorama at any location to visually validate the AI's safety assessment before committing to a route.
In the images Shown we can see , how the environment is assessed using the street view images , for the street shown in the first image environment context is higher while lower for that in second image. Also the reason for low lighting is that the screenshot was taken at night time .

---

###  Community Feedback Loop

<img width="1340" height="1032" alt="Screenshot 2026-04-06 015908" src="https://github.com/user-attachments/assets/20d4ee63-df73-4e08-a64c-bf7acc09b3ce" />

After every trip, a **Segment Rating Panel** chunks the route into geographic parts based on turns taken and asks the user to choose the safest or most unsafe part. This feedback is logged to **FeedbackLog** and processed by the RL agent.

---

## System Architecture

```mermaid
graph TB
    subgraph CLIENT[" Frontend — React 19 + TypeScript + Vite"]
        UI["UI Layer\n(Framer Motion + Tailwind)"]
        STORE["Zustand Store\n(useNavigationStore)"]
        HOOKS["Custom Hooks\n(useDirections, useNavigation\nuseUserLocation, useStreetView)"]
        MAP["MapView\n(@react-google-maps/api)"]
        
        UI --> STORE
        HOOKS --> STORE
        MAP --> STORE
    end

    subgraph BACKEND[" Backend — Node.js + Express"]
        API["REST API\n/api/segments/..."]
        CTRL["segmentController.js\n(Route Analysis Logic)"]
        SCORE["scoringService.js\n(Recompute Scores)"]
        BATCH["batchLearningService.js\n(RL Training Loop)"]
        CREDIT["creditAssignmentService.js\n(Route → Segment Feedback)"]
        CRON["node-cron\n(Hourly Batch Training)"]
    end

    subgraph DATA[" Data Layer"]
        MONGO[("MongoDB Atlas\nRoadSegment\nScoredSegment\nFeedbackLog")]
        REDIS[("Redis Cache\nRoute Analysis\nNearby Segments")]
    end

    subgraph EXTERNAL[" External APIs"]
        GMAPS["Google Maps API\n(Directions, Places,\nGeocoder, StreetView)"]
        OSM["OpenStreetMap\n(Base Road Graph)"]
    end

    CLIENT -->|"POST /api/segments/analyze-routes"| API
    CLIENT -->|"POST /api/segments/rate-segment"| API
    CLIENT -->|"POST /api/segments/rate-route-chunks"| API
    API --> CTRL
    CTRL --> MONGO
    CTRL --> REDIS
    SCORE --> MONGO
    CRON --> BATCH
    BATCH --> CREDIT
    BATCH --> MONGO
    BATCH --> MONGO
    CLIENT <-->|"Maps SDK"| GMAPS
    OSM -->|"Graph Build Script"| MONGO
```

---

##  Safety Scoring Algorithm

Each road segment in the city has **4 features** extracted at import time. The safety score is **not static** — it is computed per 2-hour time slot across a 24-hour cycle.

### Feature Weights

```
┌─────────────────────────────────────────────────────────┐
│              TIME-ADAPTIVE SAFETY WEIGHTS               │
├───────────────┬─────────────────┬───────────────────────┤
│  Feature      │  Night Weight   │  Day Weight           │
├───────────────┼─────────────────┼───────────────────────┤
│  Lighting     │  40%            │  50% (forced to 1.0)  │
│  Activity     │  25%            │  10%                  │
│  Environ.     │  20%            │  30%                  │
│  Camera       │  15%            │  10%                  │
└───────────────┴─────────────────┴───────────────────────┘
```

### Score Formula

```
computeSafetyScore(features, timeSlot t):

1. Extract values:
   L = lighting[t]            (0.0 – 1.0)
   A = activity[t]            (0.0 – 1.0)
   E = environment            (0.0 – 1.0, static)
   C = min(1.0, camera × 1.35)

2. Select weights:
   if isDaytime(t):  L = 1.0  (sun provides 100% illumination)
   weights = DAY_WEIGHTS if isDaytime else NIGHT_WEIGHTS

3. Base score:
   score = L×wL + A×wA + E×wE + C×wC

4. Penalties:
   if L < 0.3 AND A < 0.3:  score ×= 0.70   ← "Dark & Deserted"
   elif L < 0.3:            score ×= 0.85   ← "Just Dark"

5. Late-night cap:
   if t ∈ {0, 1}:  score = min(score, 0.90)  ← 12AM–4AM vulnerability

6. Clamp:
   return clamp(score, 0.02, 0.98)
```
---

## Reinforcement Learning Pipeline

The system uses a **tabular RL approach** inspired by temporal-difference learning. Rather than a neural network (which would be overkill for the data volume), it maintains a **`rl_modifier` float per segment** that shifts the pre-computed base score up or down based on community feedback.

### RL Update Rule

```
RL Update (Batch, every hour via cron): schedule of updation can be adjusted

For each new FeedbackLog:
  error = target_score - current_total_score
  weight = confidence × time_slot_confidence × learning_weight

Weighted average across all feedback for segment S:
  avg_error = Σ(error × weight) / Σ(weight)

Update rule:
  rl_modifier[S] += α × avg_error    (α = 0.20)

Clamp:
  rl_modifier[S] = clamp(rl_modifier[S], -0.30, +0.30)
```
---

## Data Flow

### Route Analysis Request Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Express Server
    participant RC as Redis Cache
    participant DB as MongoDB
    
    FE->>FE: User searches Start → End
    FE->>FE: Google Directions API returns 3 routes
    FE->>BE: POST /api/segments/analyze-routes\n{routes: [...], timeSlot: 0}
    
    BE->>RC: GET route_analysis:start:end:time
    alt Cache HIT
        RC-->>BE: Cached JSON
        BE-->>FE: 200 OK (fast)
    else Cache MISS
        BE->>DB: Find nearest RoadSegment (2dsphere)\nfor every 100m sample
        DB-->>BE: Segment features + scores
        BE->>BE: Distance-weighted safety\naggregation per route
        BE->>BE: Rank: Safest / Balanced / Fastest
        BE->>RC: SETEX 12h (cache for 12 hours)
        BE-->>FE: 200 OK + route analysis
    end
    
    FE->>FE: Render RouteCards with\nSafety Score badges
    FE->>FE: Render RouteInsightsPanel\nwith feature breakdown
```

### Feedback → RL Training Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Express
    participant DB as MongoDB
    participant CRON as Cron Job (hourly)
    
    U->>FE: Completes trip simulation
    FE->>FE: TripSummaryModal appears
    U->>FE: Rates route segments
    FE->>BE: POST /api/segments/rate-route-chunks\n{route_chunks, safest_chunk_id, confidence}
    BE->>DB: Write FeedbackLog\n{is_processed: false}
    BE-->>FE: {success: true}
    FE->>FE: "Model Updated" toast shown
    
    Note over CRON: Runs every hour at :00
    CRON->>DB: Find FeedbackLog where\nis_processed = false (limit 100)
    CRON->>CRON: decomposeRouteRating()\ncreditAssignmentService
    CRON->>DB: bulkWrite rl_modifier updates\nto ScoredSegments
    CRON->>DB: Mark all logs is_processed = true
```

---

## Tech Stack

### Frontend

| Technology | Role |
|-----------|------|
| **React 19** | Component framework |
| **TypeScript 5.9** | Type safety throughout |
| **Vite 8** | Build tool & dev server |
| **Framer Motion** | Spring animations, page transitions |
| **Zustand** | Global state management |
| **@react-google-maps/api** | Maps SDK wrapper |
| **Tailwind CSS 3** | Utility-first styling |
| **Lucide React** | Icon library |

### Backend

| Technology | Role |
|-----------|------|
| **Node.js + Express** | REST API server |
| **MongoDB + Mongoose** | Primary datastore (2dsphere geo-queries) |
| **Redis** | Response caching (12h TTL for route analysis) |
| **node-cron** | Hourly RL batch training scheduler |

### AI / Algorithms

| Component | Technique |
|-----------|-----------|
| **Safety Scoring** | Weighted multi-feature linear model (time-adaptive) |
| **RL Update** | Tabular temporal-difference (α=0.20, clamped modifier) |
| **Credit Assignment** | Inverse-safety proportional weighting |
| **Route Analysis** | Distance-weighted spatial averaging + chokepoint detection |
| **Geo-querying** | MongoDB 2dsphere index, Haversine distance |

---

##  Getting Started

### Prerequisites

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Node.js | ≥ 18.x | Runtime for frontend & backend |
| npm | ≥ 9.x | Package manager |
| MongoDB | Atlas or local 6.x | Primary database |
| Redis | 7.x | Caching layer |
| Google Maps API Key | — | Maps, Directions, Places |

#### 1. Clone the Repository

```bash
git clone https://github.com/aprajita-99/Midnight-Maps.git
cd Midnight-Maps
```
#### 2. Configure Environment Variables

Frontend `.env` (project root)

```env
VITE_GOOGLE_MAPS_API_KEY = your-api-key
MONGODB_URI=your-database-url ( database here is very important because of all the data being present here )
VITE_API_BASE_URL=https://localhost:5000
RL_TRAINING_INTERVAL_MS=300000
```

**Required Google Maps APIs to enable:**
- Maps JavaScript API
- Directions API
- Places API
- Geocoding API
- Street View Static API

Backend `.env` (`/backend/.env`)

```env
PORT=5000
MONGODB_URI=your-database-URL
NODE_ENV=development
REDIS_URL=your-Redis_URL

```

#### 3. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

#### 4. Seed the Database

Import the road graph and safety features into MongoDB:

```bash
Step 1 - Run the script enrich_activity.py to fill the database with the segments and their activity values
Step 2 - Run the script update_lighting.py to update the database with lighting values.
Step 3 - Run the script update_camera.py to update the database with camera feature values.
Step 4 - Download the model from the link given (http://places2.csail.mit.edu/models_places365/resnet50_places365.pth.tar)
Step 5 - With the model and Categories365 fil , Run the script fill_environment.py
Step 6 - run recompute_safety_scores.py
- All done
```

> **Note:** The datasets directory contains pre-processed JSON files. The seed scripts read these files and insert them into the `road_segments` and `scored_segments` MongoDB collections with proper 2dsphere indices.

#### 5. Run the Application

**Terminal 1 — Backend Server:**
```bash
cd backend
npm start
# Server running on http://localhost:5000
```

**Terminal 2 — Frontend Dev Server:**
```bash
# From project root
npm run dev
# App running on http://localhost:5173
```

**Terminal 3 (optional) — Watch backend logs for RL training:**
```bash
cd backend
npm run dev
```

### 6. Verify the Setup

Open `http://localhost:5173` in your browser. You should see:

1.  The **Midnight Maps** loading screen appears briefly
2.  A dark-themed map centered on **Koramangala, Bangalore**
3.  The left sidebar shows **Search Bar** and **Travel Mode** tabs
4.  Map controls (camera, lamp, traffic toggles) appear top-right

Test route analysis:
1. Type a start location (e.g., "Forum Mall, Koramangala")
2. Type an end location (e.g., "Indiranagar, Bangalore")
3. Click **Search** — routes should appear with safety scores
4. Click **Start Simulation** to launch the navigation HUD

---

##  Data Schema

#### RoadSegment (MongoDB)

```
segment_id       String    — Unique (e.g., "12.9353_77.6251:12.9361_77.6255")
start            {lat, lng} — Segment start coordinate
end              {lat, lng} — Segment end coordinate
midpoint         {lat, lng} — Used for geo-indexing
location         GeoJSON Point — 2dsphere index on midpoint
features:
  lighting       Number[12] — Lighting value per 2h slot (0–1)
  activity       Number[12] — Foot-traffic intensity per slot (0–1)
  camera         Number     — Normalized CCTV presence (0–1)
  environment    Number     — Static environmental risk factor (0–1)
```

### ScoredSegment (MongoDB)

```
segment_id       String    — FK → RoadSegment.segment_id
scores           Number[12] — Safety score per 2h time slot (0.02–0.98)
rl_modifier      Number    — Community feedback delta (−0.30 to +0.30)
rating_count     Number    — Total ratings received
last_rated_at    Date      — Timestamp of last update
```

### FeedbackLog (MongoDB)

```
segment_ids       [String]  — Affected segments
ratings           [{segment_id, rating, target_score}]
feedback_type     Enum      — "segment" | "route" | "segment_fine_grained"
time_slot         Number    — 0–11 (which 2h window)
time_slot_confidence Number — How certain about the time (0–1)
confidence        Number    — User's self-reported certainty (0–1)
learning_weight   Number    — Spam-adjusted weight (0–1)
is_processed      Boolean   — Has RL agent consumed this?
user_context:
  location        GeoPoint  — User's coordinates at time of feedback
  weather         String
  lighting_conditions String
  companion_count Number
```
---

## Datasets and Models Used

### `koramangala_cameras.json`
~250 CCTV camera locations in the Koramangala area sourced from civic mapping data.
~fetched using API - "https://overpass-api.de/api/interpreter"

### `koramangala_street_lamps.json`
~1,500 street lamp positions providing granular lighting coverage data.
~fetched using API - "https://overpass-api.de/api/interpreter"

### `bangalore_city_full.json`
Full OpenStreetMap road graph for Bangalore city (~12k nodes, edges encoded as segment pairs).
~fetched using osmnx python Library.

### `365Places Model`
Downloaded From - http://places2.csail.mit.edu/models_places365/resnet50_places365.pth.tar

---

<div align="center">

**Midnight Maps**

</div>
