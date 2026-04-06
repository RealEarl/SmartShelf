import cv2
import socketio
import serial
import os
import threading
from flask import Flask, request

# Set your ports and folders here
COLAB_URL = "https://superprecise-lisha-unwelded.ngrok-free.dev"
ARDUINO_PORT = "COM7"
SAVE_FOLDER = "SCANNED_FRUITS"

# Create the save folder if it does not exist yet
os.makedirs(SAVE_FOLDER, exist_ok=True)

cv2.namedWindow('SmartShelf Live Feed', cv2.WINDOW_NORMAL)
cv2.resizeWindow('SmartShelf Live Feed', 1280, 720)

# Connect to Arduino/ESP32 (Motor and Scale)
try:
    arduino = serial.Serial(ARDUINO_PORT, 115200, timeout=0.05)
    print(f"Successfully connected to Arduino on {ARDUINO_PORT}")
except Exception as e:
    print(f"Failed to connect to Arduino: {e}")
    exit()

# Connect to Colab Server
sio = socketio.Client()

@sio.event
def connect():
    print("Connected to SmartShelf Cloud Server")

@sio.event
def disconnect():
    print("Disconnected from server")

def on_result(data):
    print("Received Analysis:", data)

sio.on('analysis_result', on_result)
sio.connect(COLAB_URL)

cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 3840)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 2160)
cap.set(cv2.CAP_PROP_SETTINGS, 1)

# Global dictionary to store the latest live sensor readings
latest_sensors = {
    'temperature': 25.0,
    'humidity': 60.0,
    'mq3': 10.0,
    'mq135': 10.0
}

# --- LOCAL WIFI SERVER FOR ENVIRONMENTAL SENSORS ---
app = Flask(__name__)

# Reduce Flask logging clutter in the terminal
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

@app.route('/sensor_endpoint', methods=['POST'])
def receive_sensors():
    data = request.json
    if data and 'sensor_value' in data:
        message = data['sensor_value']
        parts = message.split("|")
        
        for part in parts:
            if part.startswith("TEMP:") and "ERR" not in part:
                latest_sensors['temperature'] = float(part.split(":")[1])
            elif part.startswith("HUM:") and "ERR" not in part:
                latest_sensors['humidity'] = float(part.split(":")[1])
            elif part.startswith("MQ3:"):
                latest_sensors['mq3'] = float(part.split(":")[1])
            elif part.startswith("MQ135:"):
                latest_sensors['mq135'] = float(part.split(":")[1])
                
    return "OK", 200

def run_server():
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

# Start the background server to listen for ESP32 data
server_thread = threading.Thread(target=run_server)
server_thread.daemon = True
server_thread.start()
print("Local WiFi Sensor server running on port 5000.")
# ---------------------------------------------------

def check_load_sensor():
    if arduino.in_waiting > 0:
        try:
            message = arduino.readline().decode('utf-8').strip()
            
            # Print normal Arduino messages
            if message and not message.startswith("TRIGGER_CAMERA"):
                print(f"[ARDUINO]: {message}")
                
            # If it is a camera trigger, extract the picture number (1, 2, or 3)
            if message.startswith("TRIGGER_CAMERA_"):
                picture_number = int(message.split("_")[-1])
                return picture_number
        except:
            pass
    return None

# Create a temporary list to hold the three images
image_buffer = []

try:
    while True:
        # Constantly pull frames to keep the buffer empty and the video live
        ret, frame = cap.read()
        if not ret:
            break
            
        cv2.imshow('SmartShelf Live Feed', frame)
        
        # Check if Motor Arduino sent a numbered trigger over USB
        pic_num = check_load_sensor()
        
        if pic_num is not None:
            # The frame we just pulled is perfectly fresh, so we save it immediately
            filename = f"fruit_image_{pic_num}.png"
            filepath = os.path.join(SAVE_FOLDER, filename)
            cv2.imwrite(filepath, frame)
            
            # Encode image as JPEG with 90% quality to prevent socket crashes
            _, img_encoded = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            
            # Add the encoded image bytes to our temporary list
            image_buffer.append(img_encoded.tobytes())
            print(f"Image {pic_num}/3 captured and buffered.")

            # If this is the final image, bundle everything and send to Colab
            if pic_num == 3:
                payload = {
                    'images': image_buffer,
                    'sensors': latest_sensors
                }
                
                sio.emit('process_data', payload)
                
                print(f"Bundled Sensor Data -> Temp: {latest_sensors['temperature']}, Hum: {latest_sensors['humidity']}, MQ3: {latest_sensors['mq3']}, MQ135: {latest_sensors['mq135']}")
                print("Complete payload containing 3 images sent to Colab.")
                
                # Clear the buffer so it is ready for the next fruit
                image_buffer = []

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

except KeyboardInterrupt:
    pass

cap.release()
cv2.destroyAllWindows()
sio.disconnect()
arduino.close()