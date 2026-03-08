import cv2
import requests
import base64
import time

COLAB_SERVER_URL = "https://superprecise-lisha-unwelded.ngrok-free.dev/detect"

def capture_and_send():
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Cannot open camera.")
        return

    print("Sending frames to Colab Server... Press Ctrl+C to stop.")
    
    try:
        while True:
            # Capture frame
            ret, frame = cap.read()
            if not ret:
                break
                
            # Resize frame to speed up upload
            frame = cv2.resize(frame, (320, 240))
            
            # Encode frame to Base64
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Send payload to Colab
            try:
                response = requests.post(
                    COLAB_SERVER_URL, 
                    json={"frame": frame_base64},
                    timeout=8
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"Server Response: {data}")
                else:
                    print(f"Error {response.status_code}")
            except Exception as e:
                print(f"Connection failed: {e}")
                
            # Frame sample rate
            time.sleep(0.5)
            
    except KeyboardInterrupt:
        print("Stopped by user.")
    
    cap.release()

if __name__ == "__main__":
    capture_and_send()