import cv2
import socketio
import serial
import os
# ----modified----
import datetime
import pytz
# ----end modified----

# Set your ports and folders here
COLAB_URL = "https://superprecise-lisha-unwelded.ngrok-free.dev"
ARDUINO_PORT = "COM7"
SAVE_FOLDER = "SCANNED_FRUITS"

def start_scanner():
    os.makedirs(SAVE_FOLDER, exist_ok=True)

    cv2.namedWindow('SmartShelf Live Feed', cv2.WINDOW_NORMAL)
    cv2.resizeWindow('SmartShelf Live Feed', 640, 360)

    # Connect to Arduino/ESP32 (Motor)
    try:
        arduino = serial.Serial(ARDUINO_PORT, 115200, timeout=0.05)
        print(f"Successfully connected to Arduino on {ARDUINO_PORT}")
    except Exception as e:
        print(f"Failed to connect to Arduino: {e}")
        return()

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

    fruit_id = 0
    image_buffer = []
    scanning = False

    def check_trigger_signal():
        if arduino.in_waiting > 0:
            try:
                message = arduino.readline().decode('utf-8').strip()
                if message and not message.startswith("TRIGGER_CAMERA"):
                    print(f"[ARDUINO]: {message}")
                if message.startswith("TRIGGER_CAMERA_"):
                    picture_number = int(message.split("_")[-1])
                    return picture_number
            except:
                pass
        return None

    try:
        print(f"Camera running. Press 'c' to start scanning ID_{fruit_id}. Press 'q' to quit.")
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            cv2.imshow('SmartShelf Live Feed', frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('c') and not scanning:
                arduino.write(b"START\n")
                scanning = True
                print(f"Start command sent to Arduino. Scanning ID_{fruit_id}...")
            if key == ord('q'):
                break

            if scanning:
                pic_num = check_trigger_signal()
                if pic_num is not None:
                    filename = f"ID_{fruit_id}_FRUIT_IMAGE_{pic_num}.png"
                    filepath = os.path.join(SAVE_FOLDER, filename)
                    cv2.imwrite(filepath, frame)

                    # Encode image as JPEG with 90% quality
                    _, img_encoded = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
                    image_buffer.append(img_encoded.tobytes())
                    print(f"Image {pic_num}/3 captured and buffered.")

                    if pic_num == 3:
                        # ----modified----
                        manila_tz = pytz.timezone('Asia/Manila')
                        ph_time = datetime.datetime.now(manila_tz).strftime("%Y-%m-%d %H:%M:%S")
                        
                        payload = {
                            'images': image_buffer,
                            'timestamp': ph_time
                        }
                        # ----end modified----
                        sio.emit('process_data', payload)
                        print(f"Complete payload for ID_{fruit_id} sent to Colab.")
                        image_buffer = []
                        fruit_id += 1
                        scanning = False
                        print(f"Scan complete. Press 'c' to start scanning ID_{fruit_id}.")

    except KeyboardInterrupt:
        pass

    cap.release()
    cv2.destroyAllWindows()
    sio.disconnect()
    arduino.close()

# Add this at the very bottom of the file!
if __name__ == 'main':
    start_scanner()