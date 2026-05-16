from __future__ import annotations
from typing import Any, Dict
import cv2
import threading

ANALYSIS_SCALE = 0.5
_ALPHA = 0.8

_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

# Per-camera state instead of a single global dict
_camera_state: Dict[str, dict] = {}
_state_lock = threading.Lock()


def _get_camera_bbox(camera_id: str) -> dict:
    with _state_lock:
        if camera_id not in _camera_state:
            _camera_state[camera_id] = {"x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0}
        return _camera_state[camera_id]


def _resize_for_analysis(frame):
    return cv2.resize(frame, (0, 0), fx=ANALYSIS_SCALE, fy=ANALYSIS_SCALE)


def detect_primary_face(frame, camera_id: str = "default") -> dict[str, Any] | None:
    small = _resize_for_analysis(frame)
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

    faces = _cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(int(30 * ANALYSIS_SCALE), int(30 * ANALYSIS_SCALE)),
        maxSize=(int(300 * ANALYSIS_SCALE), int(300 * ANALYSIS_SCALE)),
    )

    smoothed = _get_camera_bbox(camera_id)

    if not len(faces):
        smoothed.update({"x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0})
        return None

    x, y, fw, fh = faces[0]
    scale = 1 / ANALYSIS_SCALE
    x, y, fw, fh = int(x * scale), int(y * scale), int(fw * scale), int(fh * scale)

    smoothed["x"] = _ALPHA * x + (1 - _ALPHA) * smoothed["x"]
    smoothed["y"] = _ALPHA * y + (1 - _ALPHA) * smoothed["y"]
    smoothed["w"] = _ALPHA * fw + (1 - _ALPHA) * smoothed["w"]
    smoothed["h"] = _ALPHA * fh + (1 - _ALPHA) * smoothed["h"]

    if smoothed["w"] <= 100:
        return None

    return {
        "bbox": {
            "x": int(smoothed["x"]) - 5,
            "y": int(smoothed["y"]) - 5,
            "width": int(smoothed["w"]) + 10,
            "height": int(smoothed["h"]) + 50,
        },
        "region": {
            "x": int(smoothed["x"]),
            "y": int(smoothed["y"]),
            "w": int(smoothed["w"]),
            "h": int(smoothed["h"]),
        },
        "gender": "unknown",
        "face_confidence": 1.0,
    }