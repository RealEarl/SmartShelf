import cv2
import serial
import os

# Set your port and folder here
ARDUINO_PORT = "COM7"
SAVE_FOLDER = "SCANNED_FRUITS"

# Create the save folder if it does not exist yet
os.makedirs(SAVE_FOLDER, exist_ok=True)

cv2.namedWindow('SmartShelf Live Feed', cv2.WINDOW_NORMAL)
cv2.resizeWindow('SmartShelf Live Feed', 1280, 720)

# Connect to Arduino
try:
    arduino = serial.Serial(ARDUINO_PORT, 115200, timeout=0.05)
    print(f"Successfully connected to Arduino on {ARDUINO_PORT}")
except Exception as e:
    print(f"Failed to connect to Arduino: {e}")
    exit()

cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 3840)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 2160)
cap.set(cv2.CAP_PROP_SETTINGS, 1)

# Initialize the fruit ID tracking variable
fruit_id = 0

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
    print(f"Camera running offline. Waiting for ID_{fruit_id}...")
    while True:
        # Constantly pull frames to keep the buffer empty and the video live
        ret, frame = cap.read()
        if not ret:
            break
            
        cv2.imshow('SmartShelf Live Feed', frame)
        
        # Check if Arduino sent a numbered trigger
        pic_num = check_load_sensor()
        
        if pic_num is not None:
            # Format the new filename
            filename = f"ID_{fruit_id}_FRUIT_IMAGE_{pic_num}.png"
            filepath = os.path.join(SAVE_FOLDER, filename)
            cv2.imwrite(filepath, frame)
            
            print(f"Saved: {filename}")

            # If picture 3 is taken, the full rotation is done. Advance the ID.
            if pic_num == 3:
                fruit_id += 1
                print(f"Rotation complete. Advancing to ID_{fruit_id}.")

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

except KeyboardInterrupt:
    pass

cap.release()
cv2.destroyAllWindows()
arduino.close()