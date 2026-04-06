import os
import shutil
import numpy as np
import cv2
from ultralytics import YOLO

# 1. Define your local Windows file paths
base_path = r"Y:\EXTRACTED_IMAGES\Datasets"
model_path = r"C:\Workspace\Project\Python\SmartShelf\Colab\smartshelf_best.pt"

# 2. Initialize YOLO for local execution
print('Loading YOLO model...')
yolo_model = YOLO(model_path)

fruits = ['AVOCADO']
folder_mapping = {'RAW_IMAGES_FRESH': 'TRAINING_FRESH', 'RAW_IMAGES_SPOILED': 'TRAINING_SPOILED'}
valid_extensions = ('.jpg', '.jpeg', '.png')

kernel = np.ones((3,3), np.uint8)

for fruit in fruits:
    print(f'Processing {fruit} with mask cleaning...')
    null_dir = os.path.join(base_path, fruit, 'NULL')
    os.makedirs(null_dir, exist_ok=True)

    for raw_folder, target_folder in folder_mapping.items():
        input_dir = os.path.join(base_path, fruit, raw_folder)
        output_dir = os.path.join(base_path, fruit, target_folder)
        os.makedirs(output_dir, exist_ok=True)
        
        if not os.path.exists(input_dir): 
            continue

        for img_name in [f for f in os.listdir(input_dir) if f.lower().endswith(valid_extensions)]:
            input_path = os.path.join(input_dir, img_name)
            
            try:
                # 3. Retina masks enabled for maximum pixel precision
                results = yolo_model(input_path, retina_masks=True, verbose=False)
                
                if not results[0].masks:
                    shutil.copy(input_path, os.path.join(null_dir, img_name))
                    continue

                img = cv2.imread(input_path)
                if img is None:
                    print(f"Warning: Could not read image {input_path}. Skipping.")
                    continue
                
                raw_mask = (results[0].masks.data[0].cpu().numpy() > 0.5).astype(np.uint8)
                raw_mask = cv2.resize(raw_mask, (img.shape[1], img.shape[0]))

                # 4. Morphological Cleaning
                cleaned_mask = cv2.erode(raw_mask, kernel, iterations=1)
                cleaned_mask = cv2.GaussianBlur(cleaned_mask.astype(float), (5, 5), 0)
                cleaned_mask = (cleaned_mask > 0.5).astype(np.uint8)

                masked_img = img * np.stack([cleaned_mask] * 3, axis=-1)

                box = results[0].boxes[0].xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = map(int, box)

                # 5. Crop and resize to 224x224 for Autoencoder limits
                cropped = cv2.resize(masked_img[y1:y2, x1:x2], (224, 224))
                cv2.imwrite(os.path.join(output_dir, img_name), cropped)
                
            except Exception as e: 
                print(f'Error {img_name} {e}')

print('Dataset Prepared with cleaned masks.')