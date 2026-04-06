import cv2
import os

def extract_frames(video_path, output_folder, frame_interval=5):
    # Create output directory if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Open the video file
    vidcap = cv2.VideoCapture(video_path)
    success, image = vidcap.read()
    count = 0
    extracted_count = 0

    print(f"Starting extraction from {video_path}...")

    while success:
        # Save every Nth frame based on frame_interval
        if count % frame_interval == 0:
            frame_name = os.path.join(output_folder, f"frame_{count:04d}.png")
            cv2.imwrite(frame_name, image)
            extracted_count += 1
        
        success, image = vidcap.read()
        count += 1

    vidcap.release()
    print(f"Done! Extracted {extracted_count} frames out of {count} total frames to {output_folder}.")

if __name__ == "__main__":
    # Define your base input and output directories here
    BASE_INPUT_DIR = r"Y:\EXTRACTED_IMAGES"
    BASE_OUTPUT_DIR = r"Y:\EXTRACTED_IMAGES"

    filename = input("Enter the video filename (e.g., video.mp4): ")
    
    video_path = os.path.join(BASE_INPUT_DIR, filename)
    video_name = os.path.splitext(filename)[0]
    output_folder = os.path.join(BASE_OUTPUT_DIR, video_name)
    
    # You can change frame_interval to control extraction rate
    # interval = 10 means extracting 3 frames per second (from a 30fps video)
    # interval = 30 means extracting 1 frame per second
    extract_frames(video_path, output_folder, frame_interval=10)