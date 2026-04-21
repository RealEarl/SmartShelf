import cv2
import time
import socketio

# Paste your Colab ngrok link here
COLAB_URL = "https://superprecise-lisha-unwelded.ngrok-free.dev"
MISSING_TIMEOUT = 2.0  

def start_aruco():
    
    # 1. Connect to Colab Server via WebSockets (WSS) for zero delay
    sio = socketio.Client()

    @sio.event
    def connect():
        print("ArUco Subsystem Connected to Cloud Server")

    @sio.event
    def disconnect():
        print("ArUco Subsystem Disconnected from Server")

    try:
        sio.connect(COLAB_URL)
    except Exception as e:
        print(f"Warning: Could not connect to Colab at startup. {e}")

    # 2. Setup ArUco Detector
    aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    parameters = cv2.aruco.DetectorParameters()
    detector = cv2.aruco.ArucoDetector(aruco_dict, parameters)

    cv2.namedWindow('ArUco Subsystem', cv2.WINDOW_NORMAL)
    cv2.resizeWindow('ArUco Subsystem', 640, 360)

    # Note: Ensure this camera index (1) doesn't conflict with your main scanner if running on the same PC
    cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    last_seen_timestamps = {}
    current_system_state = "idle"

    # 3. Upgraded to emit Socket.IO events instead of HTTP Post
    def send_to_colab(payload):
        if sio.connected:
            sio.emit('aruco_signal', payload) 
        else:
            print("Cannot send signal: Not connected to Colab server.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        corners, ids, rejected = detector.detectMarkers(frame)
        current_time = time.time()

        if ids is not None:
            for i in range(len(ids)):
                marker_id = int(ids[i][0])
                last_seen_timestamps[marker_id] = current_time
                
                pts = corners[i][0].astype(int)
                cv2.polylines(frame, [pts], True, (0, 255, 0), 2)
                cv2.putText(frame, f"TAG {marker_id}", (pts[0][0], pts[0][1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        missing_tags = []
        for marker_id, last_seen in list(last_seen_timestamps.items()):
            if (current_time - last_seen) > MISSING_TIMEOUT:
                missing_tags.append(marker_id)

        # State Machine Logic
        if len(missing_tags) == 0:
            if current_system_state != "idle":
                current_system_state = "idle"
                print("System Idle")
                
        elif len(missing_tags) == 1:
            target = missing_tags[0]
            if current_system_state != f"ready_{target}":
                current_system_state = f"ready_{target}"
                print(f"Sending Target {target} to Colab")
                send_to_colab({"status": "ready", "target_id": target})
                
        else:
            if current_system_state != "error":
                current_system_state = "error"
                print("Multiple tags missing. Sending error to Colab.")
                send_to_colab({"status": "error", "target_id": None})

        cv2.imshow('ArUco Subsystem', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    sio.disconnect() # Cleanly disconnect the socket
    
if __name__ == '__main__':
    start_aruco()