import cv2
import socketio
import serial
import os

# Set your ports and folders here
COLAB_URL = "https://superprecise-lisha-unwelded.ngrok-free.dev"
ARDUINO_PORT = "COM7"
SAVE_FOLDER = "SCANNED_FRUITS"

# Create the save folder if it does not exist yet
os.makedirs(SAVE_FOLDER, exist_ok=True)

# Connect to Arduino
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

try:
    while True:
        # Constantly pull frames to keep the buffer empty and the video live
        ret, frame = cap.read()
        if not ret:
            break
            
        cv2.imshow('SmartShelf Live Feed', frame)
        
        # Check if Arduino sent a numbered trigger
        pic_num = check_load_sensor()
        
        if pic_num is not None:
            # The frame we just pulled is perfectly fresh, so we save it immediately
            filename = f"fruit_image_{pic_num}.png"
            filepath = os.path.join(SAVE_FOLDER, filename)
            cv2.imwrite(filepath, frame)
            
            # Encode and send to Colab
            _, img_encoded = cv2.imencode('.png', frame)
            sio.emit('process_frame', img_encoded.tobytes())
            print(f"Image {pic_num}/3 saved to {SAVE_FOLDER} and sent to Colab.")

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

except KeyboardInterrupt:
    pass

cap.release()
cv2.destroyAllWindows()
sio.disconnect()
arduino.close()