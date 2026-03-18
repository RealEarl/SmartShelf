# 🚀 YOLO Detection - Quick Start Guide

## ⚡ Super Quick Start (5 Minutes)

### 1️⃣ First Time Setup
   
**Option A: Using Batch File (Windows)**
```bash
double-click run_server.bat
```

**Option B: Using PowerShell**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\run_server.ps1
```

**Option C: Manual Setup**
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python yolo_detector.py
```

### 2️⃣ Open Web Interface
   - URL: **http://localhost:5000**
   - Book mark this page!

### 3️⃣ Start Detection
   - Click **"Start Detection"** button
   - Select your camera
   - Watch the magic happen! 🎉

---

## 📱 Essential URLs

| Purpose | URL |
|---------|-----|
| Detection Dashboard | `http://localhost:5000` |
| From Mobile (same WiFi) | `http://192.168.X.X:5000` |

---

## 🎮 Control Panel Guide

### Buttons
| Button | Action |
|--------|--------|
| ▶️ Start Detection | Begin real-time object detection |
| ⏹️ Stop Detection | Stop detection and clear video |

### Display Elements
| Element | Meaning |
|---------|---------|
| 🎥 Video Feed | Live camera view with detections |
| FPS Counter | Frames processed per second |
| Total Objects | Count of all currently detected items |
| Label Cards | Count breakdown by object type |

---

## ⚙️ Quick Configuration Changes

### Edit Detection Parameters

Open `yolo_detector.py`:

**Change Model Size** (Line 29):
```python
model = YOLO('yolov8n.pt')  # Change 'n' to:
                            # 's' (small), 'm' (medium), 'l' (large)
```

**Change Confidence** (Line 54):
```python
results = model(frame, conf=0.5, verbose=False)  # Change 0.5 to:
                                                  # 0.3 (more detections)
                                                  # 0.7 (fewer detections)
```

**Change Video Resolution** (Lines 37-38):
```python
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)   # width: 320, 480, 640, 1280
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)  # height: 240, 360, 480, 720
```

---

## 🔧 Common Problematic Cases & Fixes

### ❌ "Camera not found"
```
Try Camera 1 or Camera 2 from the dropdown
Close other apps using the camera
Check if USB webcam is connected
```

### ❌ "Module not found"
```
pip install -r requirements.txt
```

### ❌ "Very slow (low FPS)"
```
Use YOLOv8n instead of 'm' or 'l'
Reduce resolution (480p instead of 720p)
Close unnecessary applications
```

### ❌ "Port 5000 already in use"
```
Change port in yolo_detector.py last line:
    socketio.run(app, host='0.0.0.0', port=5001, ...)  # Change 5000 to 5001
Then access at: http://localhost:5001
```

### ❌ "Memory error / Out of RAM"
```
Use YOLOv8n (nano) model - lightweight
Restart the server to clear memory
Close other applications
```

---

## 📊 Model Performance Comparison

| Model | Speed | Accuracy | RAM | GPU | Recommended For |
|-------|-------|----------|-----|-----|-----------------|
| **nano (n)** | Very Fast ⚡⚡⚡ | Good ✓✓ | 200MB | Optional | Laptops, Real-time |
| **small (s)** | Fast ⚡⚡ | Better ✓✓✓ | 400MB | Needed | Balanced |
| **medium (m)** | Normal ⚡ | Great ✓✓✓✓ | 800MB | Needed | Accuracy focused |
| **large (l)** | Slow | Excellent ✓✓✓✓✓ | 1.5GB | Required | High precision |

---

## 🎯 Object Classes Detected (80 Total)

**Common ones:**
```
person, car, truck, bus, dog, cat, bird, bottle, cup, 
chair, table, laptop, phone, apple, banana, etc.
```

---

## 💡 Pro Tips

1. **Optimal Lighting**: Place object or person in good lighting for better detection
2. **Distance**: Objects 1-5 meters away work best
3. **Multiple Objects**: Usually detects multiple objects in frame
4. **Consistency**: More consistent lighting = better detection
5. **Confidence**: Lower for catching everything, higher for only confident detections

---

## 📞 Quick Troubleshoot Checklist

- [ ] Python installed? → `python --version`
- [ ] Requirements installed? → `pip install -r requirements.txt`
- [ ] Server running? → Check console for errors
- [ ] Browser connected? → Try hard refresh (Ctrl+Shift+R)
- [ ] Camera working? → Test with other apps
- [ ] Port available? → Check if 5000 is free
- [ ] Internet connected? → First run downloads YOLO model

---

## 🚀 Next Steps After Getting It Working

### Level 1: Customize
- [ ] Change model size for speed/accuracy trade-off
- [ ] Adjust video resolution
- [ ] Change confidence threshold

### Level 2: Integrate
- [ ] Save detection data to CSV/JSON
- [ ] Send alerts for specific objects
- [ ] Store snapshots when objects detected

### Level 3: Deploy
- [ ] Run on Raspberry Pi or edge device
- [ ] Setup RTSP stream for multiple clients
- [ ] Add authentication and HTTPS

---

## 📝 File Reference

```
SmartShelf/
├── yolo_detector.py          ← Main server (run this!)
├── Gui/
│   ├── home.html             ← Web interface (open this in browser)
│   └── CSS/
│       └── detection.css     ← Styling
├── requirements.txt          ← Dependencies (pip install -r this)
├── run_server.bat            ← Windows launcher
├── run_server.ps1            ← PowerShell launcher
├── YOLO_SETUP_GUIDE.md       ← Detailed guide
└── QUICK_START.md            ← This file
```

---

## 📚 Resources

- **YOLO Docs**: https://docs.ultralytics.com/
- **Flask-SocketIO**: https://flask-socketio.readthedocs.io/
- **OpenCV**: https://docs.opencv.org/
- **PyTorch**: https://pytorch.org/

---

## ✨ You're All Set!

**Your real-time YOLO detection system is ready to use!**

1. Run `run_server.bat` (or `run_server.ps1`)
2. Open `http://localhost:5000` in browser
3. Click "Start Detection"
4. Watch live detection results!

**Questions?** Check YOLO_SETUP_GUIDE.md for detailed troubleshooting

---

**Happy Real-time Detecting! 🎉**
