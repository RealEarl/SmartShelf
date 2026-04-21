import cv2
import os

os.makedirs('Markers', exist_ok=True)
aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)

for marker_id in range(20):
    marker_image = cv2.aruco.generateImageMarker(aruco_dict, marker_id, 200)
    cv2.imwrite(f'Markers/marker_{marker_id}.png', marker_image)

print("Printing complete. Check the Markers folder.")