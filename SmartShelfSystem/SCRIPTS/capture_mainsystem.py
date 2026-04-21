import cv2
import socketio
import serial
import os
import threading
# render_template and flask_socketio are removed
from flask import Flask, request, jsonify 

# Set your ports and folders here
COLAB_URL = "https://superprecise-lisha-unwelded.ngrok-free.dev"
ARDUINO_PORT = "COM7"
SAVE_FOLDER = "SCANNED_FRUITS"

def start_scanner():
    
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

    # Connect to Colab Server (Client)
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

    cap = cv2.VideoCapture(2, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 3840)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 2160)
    cap.set(cv2.CAP_PROP_SETTINGS, 1)

    # Global dictionary to store the latest live sensor readings
    latest_sensors = {
        'temperature': 00.0,
        'humidity': 00.0,
        'mq3': 00.0,
        'mq135': 00.0
    }

    # --- LOCAL WIFI SERVER FOR ENVIRONMENTAL SENSORS ONLY ---
    # Removed template_folder and static_folder (handled by Cloud Web App)
    app = Flask(__name__)

    # Reduce Flask logging clutter in the terminal
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)

    # ==========================================
    # SENSOR ENDPOINT (Kept so ESP32 can send data here for the Colab payload)
    # ==========================================

    @app.route('/sensor_endpoint', methods=['POST'])
    def receive_sensors():
        data = request.json
        if data and 'sensor_value' in data:
            message = data['sensor_value']
            parts = message.split("|")
            
            for part in parts:
                if ':' in part:
                    k, v = part.split(':', 1)
                    v_clean = v.strip()
                    
                    # Update global dictionary for the Colab payload
                    if part.startswith("TEMP:") and "ERR" not in part:
                        latest_sensors['temperature'] = float(v_clean)
                    elif part.startswith("HUM:") and "ERR" not in part:
                        latest_sensors['humidity'] = float(v_clean)
                    elif part.startswith("MQ3:"):
                        latest_sensors['mq3'] = float(v_clean)
                    elif part.startswith("MQ135:"):
                        latest_sensors['mq135'] = float(v_clean)
                        
            # (The local web dashboard SocketIO emission was removed here)
            return jsonify({"status": "success"}), 200
            
        return jsonify({"status": "error"}), 400

    def run_server():
        # Reverted back to standard Flask app.run (No longer using server_socketio.run)
        app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

    # Start the background server to listen for ESP32 data
    server_thread = threading.Thread(target=run_server)
    server_thread.daemon = True
    server_thread.start()
    print("Local WiFi Sensor receiver running on port 5000.")
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
    
# Add this at the very bottom of the file!
if __name__ == '__main__':
    start_scanner()