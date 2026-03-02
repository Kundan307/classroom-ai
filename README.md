# ClassroomAI - Neural Classroom Monitor

An AI-powered classroom monitoring web application that uses the laptop camera to detect students, analyze behavior in real-time, and provide live analytics. All AI processing runs **100% in the browser** -- nothing is uploaded to any server.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [AI Models](#ai-models)
- [Behavior Classification](#behavior-classification)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Color Palette](#color-palette)
- [API Endpoints](#api-endpoints)
- [License](#license)

---

## Features

- **Dual AI Detection Pipeline** -- Face-api.js for facial expression analysis + COCO-SSD for full-body person detection
- **Real-Time Behavior Analysis** -- Classifies students as Attentive, Engaged, Confused, Distracted, Drowsy, or Present
- **Face-Only Bounding Boxes** -- Tight boxes around detected faces with neon glow effects and corner brackets
- **Full-Body Person Tracking** -- Detects people even from behind, far away, or with faces not visible
- **Glass-Morphism Overlay Stats** -- Live student count, attention score, and behavior breakdown displayed on top of the camera feed
- **Analytics Dashboard** -- Timeline charts, behavior distribution pie chart, and session metrics
- **Dark / Light Theme** -- Toggle between themes with persistent preference
- **Fullscreen Camera Mode** -- Expand the camera view to fill the entire screen
- **Session Data Export** -- Download session analytics as JSON
- **Codebase Download** -- One-click download of the entire source code
- **100% Client-Side AI** -- Zero cloud uploads, all inference runs locally via WebGL

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| TypeScript 5.6 | Type safety |
| Vite 7 | Build tool and dev server |
| TailwindCSS 3 | Utility-first styling |
| Shadcn UI | Pre-built accessible UI components (built on Radix UI) |
| Recharts | Charts and data visualization |
| Framer Motion | Animations |
| Wouter | Lightweight client-side routing |
| Lucide React | Icon library |
| TanStack React Query v5 | Server state management and caching |
| React Hook Form | Form management |
| Zod | Schema validation |

### Backend
| Technology | Purpose |
|---|---|
| Express 5 | HTTP server |
| TypeScript + tsx | Server-side TypeScript runtime |
| Drizzle ORM | Database schema and query builder |
| express-session | Session management |
| memorystore | In-memory session storage |

### AI / Computer Vision
| Technology | Purpose |
|---|---|
| @vladmandic/face-api | Face detection, 68-point landmarks, expression recognition, age/gender estimation |
| @tensorflow-models/coco-ssd | Full-body person detection (COCO dataset, SSD architecture) |
| @tensorflow/tfjs | TensorFlow.js runtime (WebGL backend with CPU fallback) |

### Dev Tools
| Technology | Purpose |
|---|---|
| Vite | HMR, bundling, dev server proxy |
| PostCSS + Autoprefixer | CSS processing |
| Drizzle Kit | Database migrations |
| esbuild | Fast TypeScript transpilation |

---

## Architecture

```
Browser (Client)                          Server (Express)
+----------------------------------+      +---------------------+
|                                  |      |                     |
|  React App (SPA)                 |      |  API Routes         |
|  +----------------------------+  |      |  /api/sessions      |
|  | CameraFeed                 |  |      |  /api/sessions/:id  |
|  |  - getUserMedia (webcam)   |  |      |  /api/download-     |
|  |  - face-api.js detection   |  |      |    codebase         |
|  |  - COCO-SSD detection      |  |      |                     |
|  |  - Canvas overlay drawing  |  |      |  In-Memory Storage   |
|  +----------------------------+  |      |  (sessions, snaps)  |
|  | StatsOverlay               |  |      |                     |
|  |  - Glass-morphism panels   |  |      |  Vite Dev Server    |
|  |  - Live metrics            |  |      |  (proxied in dev)   |
|  +----------------------------+  |      +---------------------+
|  | AnalyticsPanel             |  |
|  |  - Timeline area charts   |  |
|  |  - Behavior pie chart     |  |
|  |  - Session stats cards    |  |
|  +----------------------------+  |
|  | ThemeProvider              |  |
|  |  - Dark/light mode toggle |  |
|  +----------------------------+  |
|                                  |
|  AI Models (loaded from CDN)     |
|  - ssd_mobilenetv1              |
|  - face_landmark_68             |
|  - face_expression              |
|  - age_gender                   |
|  - coco-ssd (mobilenet_v2)      |
+----------------------------------+
```

All AI inference runs in the browser via WebGL. The server is minimal -- it only handles session data persistence and serves the static frontend.

---

## AI Models

### Face-api.js (via @vladmandic/face-api)

| Model | Purpose |
|---|---|
| SSD MobileNet v1 | Face detection (bounding boxes) |
| 68-Point Face Landmarks | Facial landmark positions (eyes, nose, mouth, jaw) |
| Face Expression Net | 7-emotion recognition (happy, sad, angry, disgusted, fearful, surprised, neutral) |
| Age Gender Net | Age and gender estimation |

Models are loaded from the jsDelivr CDN at runtime.

### COCO-SSD (via @tensorflow-models/coco-ssd)

| Model | Purpose |
|---|---|
| MobileNet v2 (lite) | Full-body person detection from the COCO dataset |

Detects up to 20 people per frame. Can identify people from behind, far away, or with faces not visible to the camera.

### Detection Pipeline

1. Every ~200ms, a frame is captured from the webcam
2. Face-api.js runs face detection + landmarks + expressions + age/gender
3. COCO-SSD runs person detection in parallel
4. Detections are merged: faces matched to bodies via center-point overlap
5. Face-detected people get behavior classification; body-only detections are labeled "Present"
6. Results are drawn on the canvas overlay with colored bounding boxes

---

## Behavior Classification

| Behavior | Color | Detection Method |
|---|---|---|
| Attentive | Yellow (#facc15) | Neutral expression with open eyes (high EAR) |
| Engaged | Cyan (#22d3ee) | Happy or surprised expression |
| Confused | Orange (#f97316) | Fearful or disgusted expression |
| Distracted | Rose (#f43f5e) | Sad or angry expression |
| Drowsy | Red (#ef4444) | Low eye aspect ratio (EAR < 0.22) |
| Present | Violet (#a78bfa) | Body detected but no face visible |

### Eye Aspect Ratio (EAR)

Drowsiness detection uses the eye aspect ratio computed from the 68-point facial landmarks:

```
EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
```

Where p1-p6 are the six landmark points around each eye. An EAR below 0.22 indicates drowsiness.

---

## Project Structure

```
classroom-ai/
+-- client/                          # Frontend (React + Vite)
|   +-- src/
|   |   +-- components/
|   |   |   +-- camera-feed.tsx      # Webcam + detection loop + canvas overlay
|   |   |   +-- stats-overlay.tsx    # Glass-morphism stats panels on camera
|   |   |   +-- analytics-panel.tsx  # Charts, pie chart, session metrics
|   |   |   +-- theme-provider.tsx   # Dark/light mode context provider
|   |   |   +-- ui/                  # Shadcn UI components (button, card, badge, etc.)
|   |   +-- hooks/
|   |   |   +-- use-toast.ts         # Toast notification hook
|   |   |   +-- use-mobile.tsx       # Mobile breakpoint detection
|   |   +-- lib/
|   |   |   +-- face-detection.ts    # AI model loading, detection, classification, drawing
|   |   |   +-- queryClient.ts       # TanStack Query client setup
|   |   |   +-- utils.ts             # Utility functions (cn)
|   |   +-- pages/
|   |   |   +-- home.tsx             # Main page (monitor + analytics tabs)
|   |   |   +-- not-found.tsx        # 404 page
|   |   +-- App.tsx                  # Root component with routing
|   |   +-- main.tsx                 # Entry point
|   |   +-- index.css                # Global styles + CSS variables + theme colors
|   +-- index.html                   # HTML entry
+-- server/                          # Backend (Express)
|   +-- index.ts                     # Server entry point
|   +-- routes.ts                    # API routes (sessions, codebase download)
|   +-- storage.ts                   # In-memory data storage interface
|   +-- vite.ts                      # Vite dev server integration
|   +-- static.ts                    # Static file serving (production)
+-- shared/
|   +-- schema.ts                    # Shared TypeScript types + Zod schemas
+-- tailwind.config.ts               # Tailwind configuration (behavior + cyber colors)
+-- vite.config.ts                   # Vite build configuration
+-- tsconfig.json                    # TypeScript configuration
+-- drizzle.config.ts                # Drizzle ORM configuration
+-- package.json                     # Dependencies and scripts
```

---

## Running Locally

### Prerequisites

- **Node.js** 18 or higher -- [download here](https://nodejs.org/)
- **npm** (comes bundled with Node.js)
- A **webcam** (built-in laptop camera or USB webcam)
- A modern browser with **WebGL** support (Chrome or Edge recommended)

### Step-by-Step Setup

**1. Extract the project**

If you downloaded the `.tar.gz` archive:
```bash
tar -xzf classroom-ai-codebase.tar.gz -C classroom-ai
cd classroom-ai
```

If you have the folder already:
```bash
cd classroom-ai
```

**2. Install dependencies**

```bash
npm install
```

This will install all packages (~200MB). It may take 1-2 minutes depending on your internet speed.

**3. Set up environment variables**

Create a `.env` file in the project root:
```bash
echo "SESSION_SECRET=any-random-string-here" > .env
```

Or on Windows (PowerShell):
```powershell
"SESSION_SECRET=any-random-string-here" | Out-File -Encoding utf8 .env
```

**4. Start the development server**

```bash
npm run dev
```

You should see:
```
[express] serving on port 5000
```

**5. Open in browser**

Go to **http://localhost:5000** in Chrome or Edge.

### What Happens on First Load

1. The page opens with the "Neural Classroom Monitor" hero screen
2. Click **Initialize Monitor**
3. Your browser will ask for **camera permission** -- click Allow
4. AI models download from the jsDelivr CDN (~15-20MB total, first time only)
   - SSD MobileNet v1 (face detection)
   - 68-point face landmark model
   - Face expression model
   - Age/gender model
   - COCO-SSD model (body detection)
5. Models are cached by your browser, so subsequent loads are instant
6. Once loaded, you'll see live detection with bounding boxes around faces

### Troubleshooting

| Problem | Solution |
|---|---|
| `npm install` fails | Make sure you have Node.js 18+. Run `node --version` to check. |
| Camera not working | Check browser permissions. Try `chrome://settings/content/camera` in Chrome. |
| "WebGL not available" | Update your graphics drivers or try a different browser. |
| Models not loading | Check your internet connection. Models are fetched from `cdn.jsdelivr.net`. |
| Slow detection | Close other tabs. WebGL performance depends on GPU. Try Chrome over Firefox. |
| Port 5000 in use | Kill the existing process or change the port in `server/index.ts`. |
| Black screen (no video) | Some browsers block camera on `http://`. Try `https://` or use `localhost`. |

### Running in Production Mode

To build and serve the optimized production version:

```bash
# Build the frontend
npm run build

# Start the production server
NODE_ENV=production npm run start
```

On Windows:
```powershell
npm run build
$env:NODE_ENV="production"; npm run start
```

### Using the App

1. Open the app in your browser at **http://localhost:5000**
2. Click **Initialize Monitor** to start the camera and AI detection
3. Allow camera access when prompted
4. The AI models will load (~5-10 seconds on first load, cached after)
5. Students will be detected with colored bounding boxes and behavior labels
6. Switch to the **Analytics** tab to see live charts and metrics
7. Click **Stop** to end the session
8. Export session data as JSON or download the full codebase

---

## Configuration

### Environment Variables

| Variable | Description |
|---|---|
| SESSION_SECRET | Express session secret key |
| NODE_ENV | `development` or `production` |

### Detection Parameters

Found in `client/src/lib/face-detection.ts`:

| Parameter | Default | Description |
|---|---|---|
| Detection interval | 200ms | Time between detection frames |
| Min confidence (face) | 0.4 | Minimum face detection confidence |
| Max persons (COCO-SSD) | 20 | Maximum person detections per frame |
| EAR threshold | 0.22 | Eye aspect ratio for drowsiness |
| Snapshot buffer | 300 | Maximum stored snapshots per session |

---

## Color Palette

### Primary Theme
- **Primary**: Cyan `hsl(187, 85%, 53%)` -- buttons, links, active indicators
- **Background (dark)**: `hsl(220, 6%, 8%)`
- **Background (light)**: `hsl(0, 0%, 100%)`

### Behavior Colors
| Behavior | Hex | Usage |
|---|---|---|
| Attentive | `#facc15` | Bounding box, chart, badge |
| Engaged | `#22d3ee` | Bounding box, chart, badge |
| Confused | `#f97316` | Bounding box, chart, badge |
| Distracted | `#f43f5e` | Bounding box, chart, badge |
| Drowsy | `#ef4444` | Bounding box, chart, badge |
| Present | `#a78bfa` | Bounding box (dashed), chart, badge |

### Cyber Palette (UI accents)
| Name | Hex |
|---|---|
| Cyan | `#22d3ee` |
| Violet | `#a78bfa` |
| Pink | `#f43f5e` |
| Yellow | `#facc15` |
| Green | `#34d399` |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/sessions` | List all monitoring sessions |
| GET | `/api/sessions/:id` | Get a specific session |
| POST | `/api/sessions` | Create a new session |
| POST | `/api/sessions/:id/snapshots` | Add a detection snapshot to a session |
| GET | `/api/download-codebase` | Download the entire source code as .tar.gz |

---

## Browser Compatibility

| Browser | Support |
|---|---|
| Chrome 90+ | Full support (recommended) |
| Edge 90+ | Full support |
| Firefox 90+ | Supported (WebGL may be slower) |
| Safari 15+ | Partial (WebGL limitations) |

WebGL is required for AI model inference. The app falls back to CPU if WebGL is unavailable, but performance will be significantly slower.

---

## Privacy

All AI processing runs entirely in the browser. No video frames, images, or detection data are sent to any external server. The webcam feed stays on the user's device at all times.

---

## License

MIT
