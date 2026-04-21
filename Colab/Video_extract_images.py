import cv2
import os

def extract_frames(video_path, output_folder, frame_interval=5):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    vidcap = cv2.VideoCapture(video_path)
    success, image = vidcap.read()
    count = 0
    extracted_count = 0

    print(f"Starting extraction from {video_path}...")

    while success:
        if count % frame_interval == 0:
            frame_name = os.path.join(output_folder, f"frame_{count:04d}.png")
            cv2.imwrite(frame_name, image)
            extracted_count += 1
        
        success, image = vidcap.read()
        count += 1

    vidcap.release()
    print(f"Done! Extracted {extracted_count} frames out of {count} total frames to {output_folder}.")

if __name__ == "__main__":
    BASE_INPUT_DIR = r"Y:\EXTRACTED_IMAGES\New folder\VIDEO"
    BASE_OUTPUT_DIR = r"Y:\EXTRACTED_IMAGES\New folder\VIDEO"

    video_extensions = ('.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv')

    for filename in os.listdir(BASE_INPUT_DIR):
        if filename.lower().endswith(video_extensions):
            video_path = os.path.join(BASE_INPUT_DIR, filename)
            video_name = os.path.splitext(filename)[0]
            output_folder = os.path.join(BASE_OUTPUT_DIR, video_name)
            
            extract_frames(video_path, output_folder, frame_interval=45)