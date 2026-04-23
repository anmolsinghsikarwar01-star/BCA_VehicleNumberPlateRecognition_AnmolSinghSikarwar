from ultralytics import YOLO
import cv2
import easyocr
from collections import Counter
import re

# 1. Initialize YOLO and EasyOCR once 
model = YOLO("Models/500img.pt")
reader = easyocr.Reader(['en'], gpu=False)

def run_anpr(video_path):
    
    vehicle_data = {}
    cap = cv2.VideoCapture(video_path)
    frame_count = 0
    skip_frames = 0  

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        if frame_count % (skip_frames + 1) != 0:
            continue

        # 3. Use .track()
        results = model.track(source=frame, persist=True, tracker="bytetrack.yaml", verbose=False)

        for r in results:
            if r.boxes is not None and r.boxes.id is not None:
                boxes = r.boxes.xyxy.int().cpu().tolist()
                track_ids = r.boxes.id.int().cpu().tolist()

                for box, track_id in zip(boxes, track_ids):
                    x1, y1, x2, y2 = box
                    plate_crop = frame[max(0, y1):min(frame.shape[0], y2),
                                       max(0, x1):min(frame.shape[1], x2)]

                    if plate_crop.size == 0:
                        continue

                    # OCR Logic
                    if track_id not in vehicle_data or len(vehicle_data[track_id]) < 15:
                        ocr_result = reader.readtext(plate_crop)
                        plate_text = ""
                        for res in ocr_result:
                            plate_text += res[1] + " "
                        
                        clean_text = plate_text.strip().upper()

                        if 7 < len(clean_text) < 13:
                            if track_id not in vehicle_data:
                                vehicle_data[track_id] = []
                            vehicle_data[track_id].append(clean_text)

    cap.release()
    cv2.destroyAllWindows()

    # --- PROCESSING FINAL RESULTS ---
    global_tally = Counter()
    for track_id, plates in vehicle_data.items():
        if plates:
            for p in plates:
                clean_plate = "".join(char for char in p.upper() if char.isalnum())
                if len(clean_plate) > 4: 
                    global_tally[clean_plate] += 1

    final_plates = []
    seen = set()
    for plate, count in global_tally.most_common():
        # Using your logic: 4 frames for confidence
        if count >= 4 and plate not in seen:
            final_plates.append(f"{plate} (Seen in {count} frames)")
            seen.add(plate)

    return final_plates