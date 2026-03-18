# 🏗️ System Architecture & Data Flow

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR LAPTOP                              │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              USB Webcam / Laptop Camera              │    │
│  │  (Captures Raw Video Frames at 30 FPS)              │    │
│  └────────────────┬────────────────────────────────────┘    │
│                   │ Video Frames (Raw)                       │
│                   ▼                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │      Python Backend (yolo_detector.py)              │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ 1. Read Frame from Camera (OpenCV)       │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │                   ▼                                 │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ 2. Run YOLO Detection on Frame           │      │    │
│  │  │    - Detect objects                      │      │    │
│  │  │    - Extract labels & confidence         │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │                   ▼                                 │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ 3. Count Objects by Label               │      │    │
│  │  │    - Total count                         │      │    │
│  │  │    - Per-class count                     │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │                   ▼                                 │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ 4. Encode Frame as JPEG + Compress       │      │    │
│  │  │    - Base64 encoding                     │      │    │
│  │  │    - Quality: 80 (balanced)              │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │                   ▼                                 │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ 5. Send via Socket.IO WebSocket           │      │    │
│  │  │    - Real-time connection                │      │    │
│  │  │    - Broadcast to all clients            │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │                                                      │    │
│  │  Flask Server: http://localhost:5000               │    │
│  └────────┬──────────────────────────────────────────┘    │
│           │ WebSocket (Binary Data)                        │
│           │ & HTTP (HTML/CSS/JS)                           │
└───────────┼──────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                  WEB BROWSER                                 │
│              (Chrome, Firefox, Edge)                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           home.html (Web Interface)                 │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ Real-time Video Display                  │      │    │
│  │  │ (Receiving JPEG Frames)                  │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ Object Count Display                     │      │    │
│  │  │ - Total: 5 objects                       │      │    │
│  │  │ - person: 2                              │      │    │
│  │  │ - car: 1                                 │      │    │
│  │  │ - bottle: 2                              │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ Control Buttons                          │      │    │
│  │  │ - Start/Stop Detection                   │      │    │
│  │  │ - Switch Camera                          │      │    │
│  │  │ - FPS Counter                            │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │                                                      │    │
│  │  Styling: CSS (detection.css)                      │    │
│  │  Logic: JavaScript (Socket.IO client)              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow (Frame-by-Frame)

```
  Camera          YOLO              Server          Browser
    │              │                  │                │
    │              │                  │                │
1.  ├─ Raw Frame ──┤                  │                │
    │              │ Detect Objects   │                │
2.  │              ├─ Labels & Count  │                │
    │              │ Encode to JPEG   │                │
3.  │              ├─ Compress        │                │
    │              │ (Base64)         │                │
4.  │              │              WebSocket Event      │
    │              │              (detection)          │
5.  │              │                  ├─ Display Frame─┤
    │              │                  ├─ Update Counts─┤
    │              │                  ├─ Update FPS ──┤
6.  │              │                  │                │
    
    ◀── 33ms per cycle (30 FPS) ──▶
```

## Processing Pipeline (Per Frame)

```
Input Frame (640×480)
        │
        ▼
┌─────────────────────┐
│ Pre-processing      │
│ - Normalize         │
│ - Resize if needed  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ YOLO Neural Network │
│ YOLOv8 Nano Model   │
│ 8 Layers            │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Detection Output    │
│ - Bounding Boxes    │
│ - Class IDs (0-79)  │
│ - Confidence Score  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Post-processing     │
│ - Extract Labels    │
│ - Count by Class    │
│ - Filter conf > 0.5 │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Encode Frame        │
│ - JPEG (Q=80)       │
│ - Base64 encode     │
│ (~30-50 KB per img) │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Send via Socket.IO  │
│ WebSocket Protocol  │
│ (Low Latency)       │
└────────┬────────────┘
         │
         ▼
    Browser Display
    └─ Show video
    └─ Update stats
```

## Package Dependencies

```
┌─ Core Dependencies ─────────────────┐
│                                      │
│ Flask (Web Framework)                │
│ ├─ Handles HTTP requests             │
│ ├─ Serves HTML/CSS/JS                │
│ └─ Provides routing                  │
│                                      │
│ Flask-SocketIO (Real-time Comm)      │
│ ├─ WebSocket connections             │
│ ├─ Broadcast detection data          │
│ └─ Handle multiple clients           │
│                                      │
│ UltraYOLOv8 (Object Detection)       │
│ ├─ Load YOLOv8 models                │
│ ├─ Run inference on frames           │
│ ├─ Extract detections                │
│ └─ 80-class object detection         │
│                                      │
│ OpenCV (Computer Vision)             │
│ ├─ Capture from camera               │
│ ├─ Frame processing                  │
│ ├─ Image encoding (JPEG)             │
│ └─ Video codecs                      │
│                                      │
│ PyTorch (Deep Learning)              │
│ ├─ Neural network runtime            │
│ ├─ CPU/GPU computation               │
│ └─ Inference acceleration            │
│                                      │
└──────────────────────────────────────┘
```

## Performance Metrics

```
YOLOv8 Nano Performance on Laptop:

┌────────────────────────────────────┐
│ Input: 640×480 @ 30 FPS            │
│                                    │
│ Processing Time Per Frame:         │
│ ├─ YOLO Inference: ~30-50ms        │
│ ├─ Post-processing: ~5ms           │
│ ├─ JPEG Encode: ~10ms              │
│ ├─ WebSocket Send: ~5-10ms         │
│ └─ Total: ~50-75ms per frame       │
│                                    │
│ Actual FPS: 15-20 FPS              │
│ (Updates displayed in UI)          │
│                                    │
│ Network Bandwidth:                 │
│ ├─ Per Frame: ~30-50 KB            │
│ ├─ At 20 FPS: ~0.6-1 MB/s          │
│ ├─ Over WiFi: Adequate             │
│ └─ Latency: <100ms                 │
└────────────────────────────────────┘
```

## File Structure

```
SmartShelf/
│
├── 🔧 Backend (Python)
│   ├── yolo_detector.py          ← Main server
│   ├── requirements.txt          ← Dependencies
│   ├── run_server.bat            ← Windows launcher
│   └── run_server.ps1            ← PowerShell launcher
│
├── 🎨 Frontend (Web)
│   └── Gui/
│       ├── home.html             ← Main UI (edited)
│       ├── dashboard.html
│       ├── shelves.html
│       ├── reports.html
│       ├── settings.html
│       ├── JS/
│       │   └── home.js
│       └── CSS/
│           ├── home.css
│           ├── detection.css     ← New styling
│           ├── dashboard.css
│           └── ...
│
├── 📚 Documentation
│   ├── YOLO_SETUP_GUIDE.md       ← Detailed guide
│   ├── QUICK_START.md            ← Quick reference
│   └── ARCHITECTURE.md           ← This file
│
└── 📦 Data (Optional)
    └── Models/ (auto-downloaded)
        └── yolov8n.pt           ← YOLO model (~200 MB)
```

## WebSocket Events

```
Browser ←─────────────────→ Server

Client Sends:
├─ start_detection
│  └─ data: { camera_index: 0 }
│
├─ stop_detection
│  └─ (no data)
│
├─ switch_camera
│  └─ data: { camera_index: 1 }
│
├─ list_cameras
│  └─ (no data)
│
└─ Standard
   ├─ connect
   └─ disconnect


Server Broadcasts:
├─ detection (⚡ Every 30ms)
│  └─ {
│       total: 5,
│       labels: { person: 2, car: 1, bottle: 2 },
│       fps: 18.5,
│       frame_count: 1234,
│       frame: "base64_encoded_jpeg_data",
│       detections: [
│         { label: "person", confidence: 0.95, bbox: [x1,y1,x2,y2] },
│         ...
│       ]
│     }
│
├─ message
│  └─ { data: "Status message" }
│
├─ error
│  └─ { message: "Error description" }
│
└─ cameras_list
   └─ { cameras: [0, 1, 2] }
```

## Memory Usage

```
Typical Run (YOLOv8 Nano):

Application        Memory
─────────────────────────
Python Process     ~300 MB
  ├─ YOLOv8 Model  ~200 MB
  ├─ OpenCV        ~50 MB
  ├─ Flask         ~30 MB
  └─ Other         ~20 MB
─────────────────────────
Total              ~300 MB

Available: 8GB on typical laptop → ✅ Sufficient
```

## Troubleshooting Flow

```
Start Server
    │
    ▼
YOLO Model Loaded?
├─ No ──► Install PyTorch & Ultralytics
│        └─ Retry
│
└─ Yes ──► Camera Initialized?
           ├─ No  ──► Check USB connection
           │         └─ Try different camera index
           │
           └─ Yes ──► Server Running?
                      ├─ No  ──► Check error logs
                      │
                      └─ Yes ──► Browser Connected?
                                 ├─ No  ──► Hard refresh (Ctrl+Shift+R)
                                 │         Check WebSocket (F12 Console)
                                 │
                                 └─ Yes ──► Detection Data?
                                            ├─ No  ──► Check inference speed
                                            │
                                            └─ Yes ──► 🎉 Working!
```

---

**System runs continuously in this loop:**
1. Capture frame → 
2. Detect objects → 
3. Encode & send → 
4. Display in browser → 
5. Repeat every ~33ms

**All real-time updates happen via WebSocket for low-latency streaming!**
