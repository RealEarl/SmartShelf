import cv2
import os
import glob

def augment_images(input_folder, output_folder):
    # Create output directory if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Define common image formats to look for
    extensions = ('*.png', '*.jpg', '*.jpeg', '*.bmp')
    image_paths = []
    for ext in extensions:
        image_paths.extend(glob.glob(os.path.join(input_folder, ext)))
        image_paths.extend(glob.glob(os.path.join(input_folder, ext.upper())))

    print(f"Found {len(image_paths)} images to process in {input_folder}...")

    for img_path in image_paths:
        img = cv2.imread(img_path)
        if img is None:
            print(f"Warning: Could not read {img_path}. Skipping.")
            continue

        base_name = os.path.basename(img_path)
        name, ext = os.path.splitext(base_name)

        # 1. Rotate the image 90, 180, and 270 degrees
        rotated_90 = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
        rotated_180 = cv2.rotate(img, cv2.ROTATE_180)
        rotated_270 = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)

        # 2. Mirror the original image (1 = horizontal flip)
        mirrored = cv2.flip(img, 1)

        # 3. Mirror the rotated images
        mirrored_rotated_90 = cv2.flip(rotated_90, 1)
        mirrored_rotated_180 = cv2.flip(rotated_180, 1)
        mirrored_rotated_270 = cv2.flip(rotated_270, 1)

        # Save the new images into the output folder
        cv2.imwrite(os.path.join(output_folder, f"{name}_rot90{ext}"), rotated_90)
        cv2.imwrite(os.path.join(output_folder, f"{name}_rot180{ext}"), rotated_180)
        cv2.imwrite(os.path.join(output_folder, f"{name}_rot270{ext}"), rotated_270)
        cv2.imwrite(os.path.join(output_folder, f"{name}_mirrored{ext}"), mirrored)
        cv2.imwrite(os.path.join(output_folder, f"{name}_rot90_mirrored{ext}"), mirrored_rotated_90)
        cv2.imwrite(os.path.join(output_folder, f"{name}_rot180_mirrored{ext}"), mirrored_rotated_180)
        cv2.imwrite(os.path.join(output_folder, f"{name}_rot270_mirrored{ext}"), mirrored_rotated_270)

    print(f"Done! All augmented images are saved to {output_folder}.")

if __name__ == "__main__":
    # Define your input and output directories here
    input_dir = r"Y:\EXTRACTED_IMAGES\New folder\IMAGES"
    output_dir = r"Y:\EXTRACTED_IMAGES\New folder\IMAGES" # Set to the same as input_dir to save alongside originals
        
    if not os.path.exists(input_dir):
        print(f"Error: Input folder '{input_dir}' does not exist.")
    else:
        augment_images(input_dir, output_dir)