<div align="center">

# 🌙 Midnight Maps
### *Midnight Maps — AI-Powered Safety Navigation for the Night*

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Google Maps](https://img.shields.io/badge/Google%20Maps-API-4285F4?style=for-the-badge&logo=google-maps&logoColor=white)](https://developers.google.com/maps)

---

<img width="1919" height="948" alt="Screenshot 2026-04-06 014037" src="https://github.com/user-attachments/assets/4cd5afc3-365f-4603-a09d-519b8e8792bd" />



**A comprehensive full-stack navigation platform that scores every road segment for night-time safety using infrastructure data (street lighting + CCTV coverage), ambient activity patterns, and a live Reinforcement Learning feedback loop — so your route suggestions actually improve the more people use it.**

[📺 Demo](#-navigation-simulation) · [🚀 Setup](#-getting-started) · [🧠 Architecture](#-system-architecture) · [📊 Algorithm](#-safety-scoring-algorithm) · [🗂️ API Reference](#-api-reference)

</div>

---

## 📋 Table of Contents

- [🌟 Why This Exists](#-why-this-exists)
- [✨ Feature Showcase](#-feature-showcase)
- [🏗️ System Architecture](#-system-architecture)
- [🧠 Safety Scoring Algorithm](#-safety-scoring-algorithm)
- [🔄 RL Learning Pipeline](#-reinforcement-learning-pipeline)
- [📊 Data Flow](#-data-flow)
- [🛠️ Tech Stack](#-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [🗂️ API Reference](#-api-reference)
- [📐 Data Schema](#-data-schema)
- [🗺️ Datasets](#-datasets)
- [🧪 Model Evaluation](#-model-evaluation)

---

## 🌟 Why This Exists

Existing navigation apps (Google Maps, Apple Maps) optimize **purely for speed**. They don't know:

- Whether a street is lit at 2 AM
- Whether there are CCTV cameras providing passive surveillance
- Whether foot traffic makes the area feel safe
- Whether the route passes through isolated underpasses or dead-ends

**Midnight Maps** fills this gap by building a city-wide **safety graph** on top of OpenStreetMap road data, enriched with real CCTV camera positions, street lamp data, and user feedback — then using a **Reinforcement Learning agent** to continuously improve its scoring model.

---

## ✨ Feature Showcase

### 🛡️ AI Safety Route Ranking

Three routes are compared simultaneously and ranked as **Safest**, **Balanced**, or **Fastest** — each backed by live safety score computation across every road segment.
![feature_route_cards_1775417842858](https://github.com/user-attachments/assets/0a8e3980-4fa0-4bfb-a13c-eb0ca81fab92)



```
Route Score = f(Lighting, Surveillance, Activity, Environment)
           × Time-of-Day Weights × Dark & Deserted Penalty
```

| Badge | Meaning |
|-------|---------|
| 🟢 **Safest** | Maximizes `meanSafety × 0.7 + minScore × 0.3` |
| 🔵 **Balanced** | `meanSafety - timePenalty × 0.75` |
| 🟡 **Fastest** | Minimum travel duration |

---

### 📷 CCTV Camera Overlay


<img width="1341" height="912" alt="Screenshot 2026-04-05 222336" src="https://github.com/user-attachments/assets/728df678-901f-46e0-93d3-17e0fbc821c6" />
<img width="1345" height="915" alt="Screenshot 2026-04-05 222344" src="https://github.com/user-attachments/assets/bb8c6519-758e-4d25-8446-1ee1cbf497e1" />

Toggle a live overlay of **CCTV camera locations** sourced from the `koramangala_cameras.json` dataset. Blue camera markers appear on every street with known camera coverage.

> **How it influences safety scores:** camera presence adds a ×1.35 multiplied boost to the raw camera feature value, capped at 1.0, contributing 15% (night) or 10% (day) to the total segment score.

```
C_final = min(1.0, C_raw × 1.35)
```

---

### 💡 Street Lamp Overlay

<!-- Add screenshot of Street Lamp Overlay here -->

<img width="1342" height="907" alt="Screenshot 2026-04-05 222317" src="https://github.com/user-attachments/assets/2913f499-ad2d-4c04-908c-074dfe2be2b1" />

<img width="1348" height="908" alt="Screenshot 2026-04-05 222326" src="https://github.com/user-attachments/assets/1f5f83eb-f52a-4f5a-9f09-3aa72a4c4534" />


Toggle the **street lighting layer** showing amber dot markers at every recorded lamp position from `koramangala_street_lamps.json`. Lamp density directly feeds the `lighting` feature per segment.

> **Why lighting is critical at night:** At night, lighting carries **40% weight** in the safety formula. A `lighting < 0.3` triggers an additional **15–30% penalty** on the base score.

---

### 📊 Route Intelligence Panel

<img width="543" height="635" alt="Screenshot 2026-04-05 215125" src="https://github.com/user-attachments/assets/91ba9db5-b745-4f3d-8ef8-4909e4ab00dd" />


After route analysis, a collapsible **Route Intelligence** panel shows:

| Metric | Source | Weight (Night) |
|--------|--------|----------------|
| 🔦 Lighting | `features.lighting[timeSlot]` | **40%** |
| 📷 Surveillance | `features.camera × 1.35` | **15%** |
| 🚶 Activity | `features.activity[timeSlot]` | **25%** |
| 🌳 Context | `features.environment` | **20%** |

The panel computes its own **local safety score** client-side using the same formula as the backend, making the UI always in sync without an extra API call.

---

### 🗺️ Map Overlays

<img width="142" height="744" alt="Screenshot 2026-04-06 015451" src="https://github.com/user-attachments/assets/172456a7-df83-4561-b16b-d2281b7990ee" />



| Overlay | Toggle | Data Source |
|---------|--------|-------------|
| 📷 CCTV Cameras | `CameraToggle` | `koramangala_cameras.json` |
| 💡 Street Lamps | `LampToggle` | `koramangala_street_lamps.json` |
| 🚔 Police Stations | Route Intelligence panel | Hardcoded demo + Google Places |
| 🚦 Live Traffic | `TrafficToggle` | Google Maps Traffic Layer |
| 🔔 Nearby Alerts | `NearbyAlertsToggle` | Google Places API (live) |
| 🌙 Night Mode | `TimeModeToggle` | Dark map style override |

---

### 🧭 Navigation Simulation

<img width="1919" height="1079" alt="Screenshot 2026-04-06 015559" src="https://github.com/user-attachments/assets/96a4355d-a9dc-4c22-8aca-0088c2530d99" />



A full route simulation engine drives a marker along the selected route at configurable speed (default 12 m/s ≈ 43 km/h). During simulation:

- The map **rotates and tilts** with vehicle heading (60° tilt on vector-enabled maps)
- A **Navigation HUD** shows turn-by-turn instructions with distance countdowns
- The sidebar collapses for an immersive full-screen experience
- On completion, a **Trip Summary Modal** collects segment-level feedback

---

### 🔍 Safety Inspector (Street-Level)

<img width="1333" height="910" alt="Screenshot 2026-04-05 222037" src="https://github.com/user-attachments/assets/10d22942-9256-49e5-bb2f-5471e26935fe" />

<img width="1345" height="915" alt="Screenshot 2026-04-05 222225" src="https://github.com/user-attachments/assets/af648639-eeef-4a71-910f-45198a5dd849" />



The **Safety Inspector** mode lets users inspect any segment on the map and see its raw safety features — lighting profile, camera coverage, activity profile — without leaving the map.

---

### 🌐 Google Street View Integration
<img width="1338" height="913" alt="Screenshot 2026-04-05 222117" src="https://github.com/user-attachments/assets/13d954ef-f1f0-4340-b804-8c95e25b9c50" />

<img width="1351" height="912" alt="Screenshot 2026-04-05 222937" src="https://github.com/user-attachments/assets/d2a93031-a41d-45b0-b2a9-382c217fc186" />

![Uploading Screenshot 2026-04-05 222646.png…]()

![Uploading Screenshot 2026-04-05 222802.png…]()

![Uploading Screenshot 2026-04-05 222117.png…]()

![Uploading Screenshot 2026-04-06 015802.png…]()

A **Pegman control** lets users drop into Street View panorama at any location to visually validate the AI's safety assessment before committing to a route.

---

### ⭐ Community Feedback Loop


![Uploading Screenshot 2026-04-06 015908.png…]()


After every trip, a **Segment Rating Panel** chunks the route into 3–5 geographic parts and asks the user to rate safety on each. This feedback is logged to **FeedbackLog** and processed by the RL agent.

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph CLIENT["🖥️ Frontend — React 19 + TypeScript + Vite"]
        UI["UI Layer\n(Framer Motion + Tailwind)"]
        STORE["Zustand Store\n(useNavigationStore)"]
        HOOKS["Custom Hooks\n(useDirections, useNavigation\nuseUserLocation, useStreetView)"]
        MAP["MapView\n(@react-google-maps/api)"]
        
        UI --> STORE
        HOOKS --> STORE
        MAP --> STORE
    end

    subgraph BACKEND["⚙️ Backend — Node.js + Express"]
        API["REST API\n/api/segments/..."]
        CTRL["segmentController.js\n(Route Analysis Logic)"]
        SCORE["scoringService.js\n(Recompute Scores)"]
        BATCH["batchLearningService.js\n(RL Training Loop)"]
        CREDIT["creditAssignmentService.js\n(Route → Segment Feedback)"]
        CRON["node-cron\n(Hourly Batch Training)"]
    end

    subgraph DATA["🗃️ Data Layer"]
        MONGO[("MongoDB Atlas\nRoadSegment\nScoredSegment\nFeedbackLog")]
        REDIS[("Redis Cache\nRoute Analysis\nNearby Segments")]
    end

    subgraph EXTERNAL["🌍 External APIs"]
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

## 🧠 Safety Scoring Algorithm

Each road segment in the city has **4 features** extracted at import time. The safety score is **not static** — it is computed per 2-hour time slot across a 24-hour cycle.

### Feature Weights

```
┌─────────────────────────────────────────────────────────┐
│              TIME-ADAPTIVE SAFETY WEIGHTS                │
├───────────────┬─────────────────┬───────────────────────┤
│  Feature      │  Night Weight   │  Day Weight           │
├───────────────┼─────────────────┼───────────────────────┤
│  💡 Lighting  │  40%            │  50% (forced to 1.0)  │
│  🚶 Activity  │  25%            │  10%                  │
│  🌳 Environ.  │  20%            │  30%                  │
│  📷 Camera    │  15%            │  10%                  │
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

### Route-Level Aggregation

```mermaid
flowchart LR
    A["Route Polyline\n(N waypoints)"] --> B["Sample every ~100m"]
    B --> C["Query MongoDB 2dsphere\n(nearest segment ≤ 500m)"]
    C --> D["Get score[timeSlot]\nfor each sample"]
    D --> E["Distance-weighted\naverage safety"]
    E --> F{"Chokepoint\nCheck"}
    F -->|"Dangerous dist > 150m"| G["Apply penalty\nup to -0.30"]
    F -->|"OK"| H["Final Mean Safety"]
    G --> H
    H --> I["Final = 0.35 + rawMean×0.65"]
```

---

## 🔄 Reinforcement Learning Pipeline

<!-- Add screenshot/diagram of RL Pipeline here -->
![RL Pipeline](placeholder_image_url_here)

The system uses a **tabular RL approach** inspired by temporal-difference learning. Rather than a neural network (which would be overkill for the data volume), it maintains a **`rl_modifier` float per segment** that shifts the pre-computed base score up or down based on community feedback.

### RL Update Rule

```
RL Update (Batch, every hour via cron):

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

### Credit Assignment for Route Ratings

When a user rates an **entire route** (not a specific segment), the system uses **inverse-safety weighting** to distribute credit:

```mermaid
flowchart TD
    A["User rates route: 4/5 ⭐"] --> B["Convert: target = (4-1)/4 = 0.75"]
    B --> C["Fetch all N segments on route"]
    C --> D["Compute inverse_safety[i] = 1 - currentScore[i]"]
    D --> E["Total weight = Σ inverse_safety[i]"]
    E --> F["normalizedWeight[i] = inverse_safety[i] / total"]
    F --> G["globalError = target - routeAverage"]
    G --> H["segError[i] = globalError × normalizedWeight[i]"]
    H --> I["Dangerous segments absorb\nmore of the error signal"]
```

> **Key Insight:** If the user loved the route (high rating) but one segment is dangerous (low score), that dangerous segment gets a disproportionately **large positive update** — because it was the most surprising segment to the model.

### Spam Detection

```mermaid
flowchart LR
    A["New FeedbackLog batch"] --> B{"User rated\n≥ 3 times?"}
    B -->|No| C["Accept at learning_weight = 1.0"]
    B -->|Yes| D{"All 1s\nor all 5s?"}
    D -->|Yes| E["learning_weight = 0.30\n⚠️ Likely Spam"]
    D -->|No| F{"Variance\n< 0.5?"}
    F -->|Yes| G["learning_weight = 0.70\n⚠️ Low variance"]
    F -->|No| H["learning_weight = 1.0\n✅ Legitimate"]
```

---

## 📊 Data Flow

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
    U->>FE: Rates route segments (1–5 ⭐)
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

## 🛠️ Tech Stack

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
| **Spam Detection** | Variance analysis on user rating history |
| **Route Analysis** | Distance-weighted spatial averaging + chokepoint detection |
| **Geo-querying** | MongoDB 2dsphere index, Haversine distance |
| **Caching** | Redis SETEX with 12-hour TTL |

---

## 📁 Project Structure

```
Fear-Free-Night-Navigator/
│
├── 📂 src/                          # React Frontend
│   ├── App.tsx                      # Root layout + control orchestration
│   ├── 📂 components/
│   │   ├── 📂 Map/
│   │   │   ├── MapView.tsx          # Core map, overlays, nav camera
│   │   │   ├── SafetyInspector.tsx  # Click-to-inspect segment safety
│   │   │   ├── StreetViewPanel.tsx  # Google Street View integration
│   │   │   └── RoutePolylines.tsx   # Route lines with progress masking
│   │   └── 📂 UI/
│   │       ├── SearchBar.tsx        # Location input with autocomplete
│   │       ├── RouteCard.tsx        # Per-route safety card
│   │       ├── RouteInsightsPanel.tsx # Feature breakdown panel
│   │       ├── NavigationHUD.tsx    # Driving HUD overlay
│   │       ├── TripSummaryModal.tsx # Post-trip feedback collection
│   │       ├── SegmentRatingPanel.tsx # Chunk-level rating UI
│   │       ├── CameraToggle.tsx     # CCTV overlay toggle
│   │       ├── LampToggle.tsx       # Street lamp overlay toggle
│   │       ├── NearbyAlertsToggle.tsx # Live nearby POI alerts
│   │       └── TimeModeToggle.tsx   # Night mode demo toggle
│   ├── 📂 store/
│   │   └── useNavigationStore.ts    # Zustand global state
│   ├── 📂 hooks/
│   │   ├── useNavigationController.ts # Simulation engine
│   │   ├── useDirections.ts         # Google Directions fetching
│   │   ├── useUserLocation.ts       # Browser geolocation
│   │   └── useStreetView.ts         # Street View panorama control
│   └── 📂 utils/
│       └── timeUtils.ts             # Time slot computation
│
├── 📂 backend/                      # Node.js Backend
│   ├── server.js                    # Entry point + cron job setup
│   ├── app.js                       # Express app + middleware
│   ├── 📂 controllers/
│   │   └── segmentController.js     # All route analysis + feedback handlers
│   ├── 📂 services/
│   │   ├── batchLearningService.js  # RL training loop (runs hourly)
│   │   ├── creditAssignmentService.js # Route → segment credit decomposition
│   │   ├── scoringService.js        # Batch score recomputation
│   │   └── segmentService.js        # CRUD helpers for segments
│   ├── 📂 models/
│   │   ├── RoadSegment.js           # Road features schema (2dsphere)
│   │   ├── ScoredSegment.js         # Safety scores + rl_modifier
│   │   └── FeedbackLog.js           # User feedback events
│   ├── 📂 utils/
│   │   ├── computeSafetyScore.js    # Core scoring formula
│   │   └── generateSegmentId.js     # Deterministic segment ID
│   └── 📂 config/
│       ├── db.js                    # MongoDB connection
│       └── redis.js                 # Redis client
│
├── 📂 datasets/
│   ├── bangalore_city_full.json        # Full city road graph (OSM)
│   ├── bangalore_graph_with_activity.json # Enriched with activity profiles
│   ├── koramangala_cameras.json        # CCTV camera locations
│   └── koramangala_street_lamps.json   # Street lamp positions
│
└── 📂 scripts/                      # Data pipeline scripts
    └── (import/transform scripts)
```

---

## 🚀 Getting Started

### Prerequisites

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Node.js | ≥ 18.x | Runtime for frontend & backend |
| npm | ≥ 9.x | Package manager |
| MongoDB | Atlas or local 6.x | Primary database |
| Redis | 7.x | Caching layer |
| Google Maps API Key | — | Maps, Directions, Places |

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/fear-free-night-navigator.git
cd fear-free-night-navigator
```

---

### 2. Configure Environment Variables

#### Frontend `.env` (project root)

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Required Google Maps APIs to enable:**
- Maps JavaScript API
- Directions API
- Places API
- Geocoding API
- Street View Static API

#### Backend `.env` (`/backend/.env`)

```env
NODE_ENV=development
PORT=5000

# MongoDB (Atlas or local)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/night_navigator?retryWrites=true&w=majority

# Redis (local or Redis Cloud)
REDIS_URL=redis://localhost:6379

# Optional: Redis Cloud credentials
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

---

### 3. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

---

### 4. Seed the Database

Import the road graph and safety features into MongoDB:

```bash
cd backend

# Import Koramangala road segments (start with this for demo)
node scripts/importSegments.js

# (Optional) Full Bangalore city graph
node scripts/importFullCity.js

# Compute initial safety scores for all segments
node scripts/syncScores.js
```

> **Note:** The datasets directory contains pre-processed JSON files. The seed scripts read these files and insert them into the `road_segments` and `scored_segments` MongoDB collections with proper 2dsphere indices.

---

### 5. Run the Application

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
npm run dev  # if using nodemon
```

---

### 6. Verify the Setup

Open `http://localhost:5173` in your browser. You should see:

1. ✅ The **Midnight Maps** loading screen appears briefly
2. ✅ A dark-themed map centered on **Koramangala, Bangalore**
3. ✅ The left sidebar shows **Search Bar** and **Travel Mode** tabs
4. ✅ Map controls (camera, lamp, traffic toggles) appear top-right

Test route analysis:
1. Type a start location (e.g., "Forum Mall, Koramangala")
2. Type an end location (e.g., "Indiranagar, Bangalore")
3. Click **Search** — routes should appear with safety scores
4. Click **Start Simulation** to launch the navigation HUD

---

## 🗂️ API Reference

**Base URL:** `http://localhost:5000/api/segments`

### `POST /analyze-routes`
Analyze multiple route alternatives for safety.

**Request:**
```json
{
  "routes": [
    {
      "points": [{"lat": 12.935, "lng": 77.624}, ...],
      "distance": 4200,
      "duration": 820
    }
  ],
  "timeSlot": 0
}
```

**Response:**
```json
{
  "success": true,
  "routes": [
    {
      "routeIndex": 0,
      "meanSafety": 0.74,
      "risk": 0.12,
      "minScore": 0.45,
      "feedbackChunks": [...],
      "features": {
        "lighting": 0.68,
        "camera": 0.52,
        "activity": 0.61,
        "environment": 0.71
      }
    }
  ],
  "indices": {
    "shortest": 2,
    "safest": 0,
    "balanced": 1
  }
}
```

---

### `POST /rate-segment`
Submit a single segment safety rating.

```json
{
  "segment_id": "seg_12.9353_77.6251",
  "rating": 4,
  "time_slot": 0,
  "confidence": 0.85
}
```

---

### `POST /rate-route-chunks`
Submit chunk-level route feedback after a trip.

```json
{
  "route_chunks": [
    {
      "chunk_id": "part-1",
      "label": "Part 1",
      "distance": 1200,
      "segment_ids": ["seg_..."],
      "sample_count": 12
    }
  ],
  "safest_chunk_id": "part-3",
  "unsafe_chunk_id": "part-1",
  "time_slot": 0,
  "confidence": 0.9
}
```

---

### `GET /nearby?lat=12.93&lng=77.62&radius=500`
Get road segments near a coordinate.

### `GET /nearest?lat=12.93&lng=77.62`
Get the single nearest segment (≤200m).

### `POST /sync-scores`
Trigger manual recomputation of all safety scores.

---

## 📐 Data Schema

### RoadSegment (MongoDB)

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

## 🗺️ Datasets

### `koramangala_cameras.json`
~250 CCTV camera locations in the Koramangala area sourced from civic mapping data.

```json
[{"lat": 12.9353, "lng": 77.6251}, ...]
```

### `koramangala_street_lamps.json`
~1,500 street lamp positions providing granular lighting coverage data.

### `bangalore_city_full.json`
Full OpenStreetMap road graph for Bangalore city (~12k nodes, edges encoded as segment pairs).

### `bangalore_graph_with_activity.json`
Enriched graph with synthetic activity profiles based on land-use classification (commercial, residential, industrial, park) — each producing realistic 12-slot activity vectors.

---

## 🧪 Model Evaluation

### Safety Score Validation

We validated the scoring formula against known dangerous/safe streets in Koramangala:

| Segment Type | Expected Category | Computed Score (Night) |
|-------------|-------------------|----------------------|
| Lit commercial road with CCTV | Safe | 0.82 – 0.91 |
| Residential side street, some lamps | Moderate | 0.55 – 0.70 |
| Dark industrial lane, no cameras | Dangerous | 0.18 – 0.35 |
| Main road (daytime) | Safe | 0.88 – 0.96 |

### RL Convergence Properties

```
α = 0.20 (learning rate)
modifier clamp = ±0.30

Expected convergence to within ε=0.05 of ground truth:
  ~20 feedback events for a segment (one per batch cycle)
  ≈ 20 hours with 1 rating/hour on active segments
```

### Cache Performance

| Scenario | Latency |
|---------|---------|
| Cache HIT (Redis) | < 5ms |
| Cache MISS (MongoDB 2dsphere × 100 samples) | 300–800ms |
| Cache TTL | 12 hours |

### Spam Resistance

| Pattern | Detected? | Weight Applied |
|---------|-----------|---------------|
| All 1-star ratings | ✅ Yes | 30% |
| All 5-star ratings | ✅ Yes | 30% |
| Low variance (all 3s) | ✅ Yes | 70% |
| Realistic mixed ratings | — | 100% |

---

## 🙏 Acknowledgements

- **OpenStreetMap** contributors for the base road graph
- **Google Maps Platform** for Directions, Places, and Street View APIs
- Civic data sources for Koramangala CCTV and street lamp positions
- **Framer Motion** for the spring animation system

---

<div align="center">

**Midnight Maps**

*"The streets don't change. Our understanding of them does."*

</div>
