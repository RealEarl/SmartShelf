import cv2
import numpy as np
import threading
import base64
import time
from collections import defaultdict

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from ultralytics import YOLO

app = Flask(__name__, 
            template_folder='HTML', 
            static_folder='ASSETS')

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

CUSTOM_MODEL_PATH = r'C:\Workspace\Project\Python\SmartShelf\SmartShelfSystem\my_model.pt'

try:
    model = YOLO(CUSTOM_MODEL_PATH)
    print(f"Custom Model Loaded: {CUSTOM_MODEL_PATH}")
except Exception as e:
    print(f"Custom model error: {e}")
    print("Downloading or Using YOLOv8n as fallback...")
    model = YOLO('yolov8n.pt')

cap = None
detection_active = False
detection_thread = None
thread_lock = threading.Lock()

def initialize_camera(camera_index=0):
    global cap
    if cap is not None:
        cap.release()
        
    try:
        cap = cv2.VideoCapture(camera_index)
        if not cap.isOpened():
            if camera_index == 0:
                print("Camera 0 failed, trying Camera 1...")
                cap = cv2.VideoCapture(1)
                if not cap.isOpened():
                    return False
            else:
                return False
        
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
        cap.set(cv2.CAP_PROP_FPS, 15)
        return True
    except Exception as e:
        print(f"Camera Error: {e}")
        return False

def process_frames():
    global cap, model, detection_active
    
    print("Detection Loop Started")
    frame_count = 0
    detection_times = []
    
    while detection_active:
        if cap is None or not cap.isOpened():
            time.sleep(0.1)
            continue
            
        ret, frame = cap.read()
        if not ret:
            print("Failed to read frame")
            time.sleep(0.1)
            continue
        
        start_time = time.time()
        
        try:
            results = model(frame, conf=0.5, verbose=False)
            annotated_frame = results[0].plot()
            
            detection_info = {'total': 0, 'labels': defaultdict(int)}
            for r in results:
                for box in r.boxes:
                    c = int(box.cls)
                    label = model.names[c]
                    detection_info['labels'][label] += 1
                    detection_info['total'] += 1
            
            detection_info['labels'] = dict(detection_info['labels'])

            detection_time = time.time() - start_time
            detection_times.append(detection_time)
            if len(detection_times) > 30: detection_times.pop(0)
            avg_time = np.mean(detection_times)
            fps = 1 / avg_time if avg_time > 0 else 0
            
            _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            detection_info['frame'] = frame_base64
            detection_info['fps'] = round(fps, 1)
            
            socketio.emit('detection', detection_info)
            
            time.sleep(0.01)
            
        except Exception as e:
            print(f"Loop Error: {e}")
            break

    if cap: cap.release()
    print("Detection Loop Ended")

@app.route('/')
def login():
    return render_template('index.html')

@app.route('/home.html')
def home():
    return render_template('home.html')

@app.route('/reports.html')
def reports():
    return render_template('reports.html')

@app.route('/shelves.html')
def shelves():
    return render_template('shelves.html')

@app.route('/sensor_endpoint', methods=['POST'])
def receive_sensor_data():
    data = request.json
    if data and 'sensor_value' in data:
        socketio.emit('sensor_data', {'data': data['sensor_value']})
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error"}), 400

@socketio.on('connect')
def handle_connect():
    print('Browser Connected')

@socketio.on('start_detection')
def start_detection(data):
    global detection_active, detection_thread
    if detection_active: return
    
    idx = int(data.get('camera_index', 0))
    if initialize_camera(idx):
        detection_active = True
        detection_thread = threading.Thread(target=process_frames)
        detection_thread.daemon = True
        detection_thread.start()
        print("Detection Started")
    else:
        emit('error', {'message': 'Could not open camera'})

@socketio.on('stop_detection')
def stop_detection():
    global detection_active
    detection_active = False
    print("Stopping...")

@socketio.on('switch_camera')
def switch_camera(data):
    global detection_active
    detection_active = False 
    time.sleep(0.5) 
    start_detection(data)

@socketio.on('list_cameras')
def list_cameras():
    available = []
    for i in range(2):
        temp = cv2.VideoCapture(i)
        if temp.isOpened():
            available.append(i)
            temp.release()
    emit('cameras_list', {'cameras': available})

if __name__ == '__main__':
    print("---------------------------------------")
    print("   SMARTSHELF SERVER RUNNING")
    print("   Go to: http://localhost:5000")
    print("---------------------------------------")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)