from __future__ import annotations
import time
from typing import Any
from app.services.engines.haar_detector import detect_primary_face


def run_person_detection(frame, timestamp: str | None = None, camera_id: str | None = None) -> dict[str, Any]:
    
    start = time.perf_counter()
    height, width = frame.shape[:2]

    detection = detect_primary_face(frame, camera_id or "default")
    detections: list[dict[str, Any]] = []

    if detection:
        detections.append(
            {
                'target_id': 'target-1',
                'bbox': detection['bbox'],
                'tracking_state': 'tracking',
                'label': f"Tracking person • {detection['gender']}",
                'attributes': {
                    'gender': detection['gender'],
                    'face_confidence': detection['face_confidence'],
                },
            }
        )

    return {
        'ok': True,
        'detections': detections,
        'meta': {
            'processing_ms': round((time.perf_counter() - start) * 1000, 2),
            'camera_id': camera_id,
            'timestamp': timestamp,
            'frame_size': {'width': width, 'height': height},
            'detection_count': len(detections),
        },
    }