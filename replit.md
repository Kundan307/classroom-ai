# ClassroomAI - Smart Student Monitoring System

## Overview
AI-powered classroom monitoring application that uses the laptop camera to detect students, analyze their behavior in real-time, and provide live analytics. All AI processing runs entirely in the browser using face-api.js (TensorFlow.js).

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Shadcn UI
- **Backend**: Express.js (minimal - stores session data)
- **AI/Vision**: @vladmandic/face-api (face detection, landmarks, expressions) + @tensorflow-models/coco-ssd (full body person detection)
- **Charts**: Recharts for analytics visualization
- **Routing**: Wouter

## Key Features
- Dual AI detection: face-api.js for face/expression analysis + COCO-SSD for full-body person detection
- Detects people from behind, far away, partially visible (not just faces)
- Behavior classification (Attentive, Engaged, Confused, Distracted, Drowsy, Present) based on facial expressions + eye aspect ratio
- Live student count with floating glass-morphism overlays on camera feed
- Attention score computation
- Analytics dashboard with timeline charts and behavior distribution
- Dark/light mode toggle
- Fullscreen camera mode
- Session data export (JSON)
- 100% client-side AI processing (privacy-first)

## File Structure
- `client/src/pages/home.tsx` - Main monitoring page with camera, overlays, analytics tabs
- `client/src/components/camera-feed.tsx` - Webcam component with face detection + canvas overlay
- `client/src/components/stats-overlay.tsx` - Floating stats displayed on camera view
- `client/src/components/analytics-panel.tsx` - Charts and metrics for analytics tab
- `client/src/components/theme-provider.tsx` - Dark/light mode provider
- `client/src/lib/face-detection.ts` - Core face-api.js integration (model loading, detection, behavior classification, canvas drawing)
- `shared/schema.ts` - TypeScript types and Zod schemas for students, sessions, snapshots
- `server/routes.ts` - API routes for session management
- `server/storage.ts` - In-memory session storage

## Design
- Font: Space Grotesk (techy, modern)
- Color scheme: Dark-first with behavior-specific accent colors
- Bounding boxes: Corner bracket style with glow effects
- Stats: Glass-morphism overlays (backdrop-blur + semi-transparent)

## Dependencies
- @vladmandic/face-api - Face detection, landmarks, expressions, age/gender
- recharts - Charts for analytics
- framer-motion - Animations
- lucide-react - Icons