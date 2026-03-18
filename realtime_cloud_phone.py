import cv2
import threading
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

# PASTE YOUR LATEST NGROK WSS URL HERE
COLAB_WS_URL = "wss://superprecise-lisha-unwelded.ngrok-free.dev"
PHONE_CAMERA_URL = "http://192.168.137.234:8080/video"

def background_analysis():
    global cap, detection_active
    print(">>> BACKGROUND THREAD ACTIVATED")
    
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
        for _ in range(5):
            cap.grab()
            
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.5)
            continue
            
        # Resize and compress the image for fast transmission
        frame_resized = cv2.resize(frame, (640, 480))
        _, buffer = cv2.imencode('.jpg', frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 85])
        
        try:
            # Send the raw binary bytes
            ws.send(buffer.tobytes(), opcode=websocket.ABNF.OPCODE_BINARY)
            
            response = ws.recv()
            colab_data = json.loads(response)
            
            socketio.emit('detection_data', colab_data)
            print(f">>> SENT TO DASHBOARD {colab_data}")
            
        except Exception as e:
            print(f">>> NETWORK ERROR DURING LOOP {e}")
            break
            
        time.sleep(0.5)
        
    ws.close()
    if cap: cap.release()
    print(">>> BACKGROUND THREAD SHUTTING DOWN")

def initialize_camera():
    global cap
    if cap is not None:
        cap.release()
    try:
        cap = cv2.VideoCapture(PHONE_CAMERA_URL)
        # Minimize the internal buffer size
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return cap.isOpened()
    except Exception as e:
        print(f"Camera Error {e}")
        return False

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
    print(">>> WEB COMMAND START DETECTION RECEIVED")
    if detection_active: return
    
    if initialize_camera():
        detection_active = True
        detection_thread = threading.Thread(target=background_analysis)
        detection_thread.daemon = True
        detection_thread.start()
        print("Detection Started")
    else:
        emit('error', {'message': 'Could not connect to phone stream'})

@socketio.on('stop_detection')
def stop_detection():
    global detection_active
    detection_active = False
    print("Stopping")

if __name__ == '__main__':
    print("SMARTSHELF SERVER RUNNING")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)