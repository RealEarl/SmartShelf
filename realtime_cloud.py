import cv2
import threading
import base64
import time
import json
import websocket
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

app = Flask(__name__, template_folder='HTML', static_folder='ASSETS')
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

cap = None
detection_active = False
detection_thread = None

# Update this to your latest Ngrok WSS URL
COLAB_WS_URL = "wss://superprecise-lisha-unwelded.ngrok-free.dev"

def initialize_camera(camera_index=0):
    global cap
    if cap is not None:
        cap.release()
        
    try:
        cap = cv2.VideoCapture(camera_index)
        # Minimize the internal buffer size to prevent lag
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        if not cap.isOpened():
            if camera_index == 1:
                print("Camera 0 failed, trying Camera 1")
                cap = cv2.VideoCapture(1)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                if not cap.isOpened():
                    return False
            else:
                return False
        
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 15)
        return True
    except Exception as e:
        print(f"Camera Error {e}")
        return False

def process_frames():
    global cap, detection_active
    print(">>> DETECTION LOOP ACTIVATED")
    
    ws = websocket.WebSocket()
    try:
        ws.connect(COLAB_WS_URL)
        print(">>> WEBSOCKET CONNECTED TO COLAB")
    except Exception as e:
        print(f">>> WEBSOCKET CONNECTION ERROR {e}")
        return
        
    while detection_active:
        if cap is None or not cap.isOpened():
            time.sleep(1.0)
            continue
            
        # Flush the buffer to get the real time frame
        for _ in range(3):
            cap.grab()
            
        ret, frame = cap.read()
        if not ret:
            print("Failed to read frame")
            time.sleep(0.5)
            continue
        
        # Optimize resolution for the Colab transfer
        frame_resized = cv2.resize(frame, (640, 480))
        _, buffer_colab = cv2.imencode('.jpg', frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 85])
        
        colab_data = {}
        try:
            # Send the raw binary bytes directly to the cloud
            ws.send(buffer_colab.tobytes(), opcode=websocket.ABNF.OPCODE_BINARY)
            
            response = ws.recv()
            colab_data = json.loads(response)
        except Exception as e:
            print(f">>> NETWORK ERROR DURING LOOP {e}")
            break
        
        # Compress the image for the local web dashboard video player
        _, buffer_web = cv2.imencode('.jpg', frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 70])
        frame_base64 = base64.b64encode(buffer_web).decode('utf-8')
        
        detection_info = {
            'frame': frame_base64,
            'total': colab_data.get('total', 0),
            'labels': colab_data.get('labels', {}),
            'fps': 0
        }
        
        inference_ms = colab_data.get('inference_ms', 0)
        if inference_ms > 0:
            detection_info['fps'] = round(1000 / inference_ms, 1)
        
        socketio.emit('detection_data', detection_info)
        
        # Added a sleep timer to reduce laptop CPU usage
        time.sleep(0.5)

    ws.close()
    if cap: cap.release()
    print(">>> DETECTION LOOP SHUTTING DOWN")

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
        sensor_str = data['sensor_value']
        sensor_dict = {}
        for part in sensor_str.split('|'):
            if ':' in part:
                k, v = part.split(':', 1)
                sensor_dict[k.strip()] = v.strip()
        socketio.emit('sensor_data', sensor_dict)
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
    print("Stopping")

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
    print("SMARTSHELF SERVER RUNNING")
    print("Go to http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)