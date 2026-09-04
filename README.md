# ✦ PrepPilot AI — AI-Powered Interview Studio & Integrity Platform

> **PrepPilot AI** is an advanced, production-grade AI Mock Interview & Placement Readiness Platform featuring real-time computer vision proctoring, session-scoped identity verification, adaptive AI interviewing, and comprehensive performance analytics.

---

## 🌟 Key Features

### 🛡️ Pre-Interview Identity Verification
- **Live Camera Verification Box**: Interactive pre-interview modal with live webcam preview.
- **Biometric Landmark Descriptor**: Captures a scale-invariant, pose-normalized 11-point facial landmark distance vector (session-scoped in memory).
- **Verified Candidate Snapshot**: Takes a high-resolution snapshot photo upon identity verification, displaying the verified candidate photo on the final analysis report.
- **Privacy Disclosure**: Clear policy notice ensuring no raw biometrics are permanently stored outside the session context.

### 👁️ Real-Time Computer Vision Proctoring
- **MediaPipe 468 Landmark Mesh**: Tracks facial landmarks at 60 FPS directly in the browser using WebGL.
- **3D Head Pose Estimation**: Calculates real-time **Yaw, Pitch, and Roll** angles for natural orientation monitoring.
- **Lighting & Exposure Assessment**: Analyzes frame brightness variance to ensure candidate visibility.
- **Eye Contact & Pace Tracking**: Measures continuous candidate eye contact percentage and dynamic speaking pace (WPM).

### 🎯 Live Identity Consistency & Movement Tolerance
- **Pose & Rotation Normalization**: Landmark distance ratios are normalized by inter-pupillary scale, allowing candidates to turn their head, look down, move closer/farther, or wear glasses without false identity mismatches.
- **Temporal Debouncing**: 15-frame sliding window cosine similarity smoothing. Single-frame noise is ignored.
- **Non-Accusatory Warnings**: 3-second grace period triggers a soft guidance banner (*"⚠️ We're having trouble confirming your identity. Please ensure your face is clearly visible in the camera"*). Persistent mismatch (6s+) logs `IDENTITY_CONSISTENCY_CONCERN`.

### 🗣️ Interactive AI Interviewer (Dr. Aris Thorne)
- **Voice Synthesis (TTS)**: Realistic interviewer vocalization with rate and pitch calibration.
- **Speech Recognition & VAD**: Web Speech API Voice Activity Detection to transcribe candidate spoken responses automatically.
- **Adaptive Question Engine**: Tailors follow-up questions dynamically based on candidate experience level, target role, and technical response quality.

### 📊 Performance & Integrity Analytics
- **Competency Radar Chart**: Visualizes Communication, Technical Depth, System Design, Problem Solving, Confidence, and Answer Quality scores.
- **Identity & Integrity Audit**: Displays computed **Identity Consistency %**, **Face Presence %**, **Multiple Face Events**, **Focus Loss Count**, and **Verified Candidate Photo Card**.
- **Chronological Event Audit**: Complete audit timeline detailing every proctoring event, timestamp, and severity level.

---

## 📁 System Architecture & Directory Structure

```
PrepPilot-AI-UI/
├── index.html                  # Landing page, resume parser & candidate onboarding dashboard
├── video-interview.html        # Live video interview studio with real-time HUD canvas overlay
├── interview-analysis.html     # Detailed post-interview analytics dashboard & audit log
├── server.js                   # Node.js / Express backend serving REST API endpoints
├── package.json                # Project dependencies and script runner
├── services/
│   ├── faceDetectionService.js # MediaPipe FaceMesh controller, pose estimator & identity engine
│   ├── integrityService.js     # Deductive integrity score engine & telemetry logger
│   ├── proctoringConfig.js     # Centralized thresholds, grace periods & event deductions
│   ├── proctoringService.js    # Browser visibility, tab focus & auto-termination monitor
│   └── analyticsService.js     # Report builder & persistent localStorage manager
```

---

## 🔌 API Endpoints (`server.js`)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check endpoint returning server time and app status |
| `/api/interview/start` | `POST` | Initializes candidate interview session context & initial AI greeting |
| `/api/interview/next-question` | `POST` | Evaluates candidate spoken response and generates adaptive next question |
| `/api/interview/report` | `POST` | Computes final overall performance scores, strengths & improvements |
| `/api/interview/proctoring-event` | `POST` | Telemetry endpoint logging proctoring audit events |
| `/api/resume/parse` | `POST` | Extracts candidate profile, target role & resume highlights |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v16.0 or higher
- **Modern Web Browser**: Google Chrome, Microsoft Edge, Brave, or Safari with WebGL & Web Speech API support

### Installation & Local Run

1. **Clone Repository**:
   ```bash
   git clone https://github.com/khushalagarwal496/interview-khushal.git
   cd interview-khushal
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Local Server**:
   ```bash
   npm start
   ```
   *The platform will start running at `http://localhost:3000`.*

4. **Access Pages**:
   - Dashboard: `http://localhost:3000/index.html`
   - Video Studio: `http://localhost:3000/video-interview.html`
   - Analysis Report: `http://localhost:3000/interview-analysis.html`

---

## 🔒 Privacy, Security & Biometric Ethics

PrepPilot AI is designed with strict privacy-first principles:
1. **Session-Scoped Feature Descriptors**: Facial landmark geometry descriptors exist purely in memory during active interview sessions.
2. **No Permanent Raw Biometric Storage**: Facial landmark vectors are never stored on external databases or used for cross-session tracking.
3. **Explicit Consent & Transparency**: Candidates receive clear privacy disclosures before enabling camera & microphone streams.
4. **Fair Signals, Not Accusations**: Integrity events are classified strictly as technical observability signals with temporal debouncing to eliminate false accusations.

---

## 📄 License
This project is licensed under the ISC License. Designed for PrepPilot AI Team.
