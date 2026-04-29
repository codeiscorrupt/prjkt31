from __future__ import annotations
from typing import Any
import cv2
from deepface import DeepFace

ANALYSIS_SCALE = 0.5
MODEL_NAME = 'SFace'
DETECTOR_BACKEND = 'opencv'


def _resize_for_analysis(frame):
    return cv2.resize(frame, (0, 0), fx=ANALYSIS_SCALE, fy=ANALYSIS_SCALE)


def _scale_region(region: dict[str, Any]) -> dict[str, int]:
    return {
        'x': int(region.get('x', 0) / ANALYSIS_SCALE),
        'y': int(region.get('y', 0) / ANALYSIS_SCALE),
        'w': int(region.get('w', 0) / ANALYSIS_SCALE),
        'h': int(region.get('h', 0) / ANALYSIS_SCALE),
    }


def _first_item(value: Any):
    if isinstance(value, list):
        return value[0] if value else None
    return value


def detect_primary_face(frame) -> dict[str, Any] | None:
    """
    Detect a face and return its region in the ORIGINAL frame coordinates.
    Uses the same DeepFace analyze step pattern as your OpenCV loop.
    """
    small_frame = _resize_for_analysis(frame)

    result = DeepFace.analyze(
        img_path=small_frame,
        actions=['gender'],
        enforce_detection=False,
        detector_backend=DETECTOR_BACKEND,
        silent=True,
    )
    face_info = _first_item(result)
    if not face_info:
        return None

    if face_info.get('face_confidence', 0) <= 0:
        return None

    region = _scale_region(face_info.get('region', {}))
    return {
        'bbox': {
            'x': region['x'],
            'y': region['y'],
            'width': region['w'],
            'height': region['h'],
        },
        'region': region,
        'gender': face_info.get('dominant_gender', 'unknown'),
        'face_confidence': float(face_info.get('face_confidence', 0.0)),
    }


def build_embedding(frame) -> list[float] | None:
    """
    Create one embedding from the uploaded frame.
    This replaces the while-loop+cache logic from your local webcam script.
    """
    small_frame = _resize_for_analysis(frame)

    representations = DeepFace.represent(
        img_path=small_frame,
        model_name=MODEL_NAME,
        enforce_detection=False,
        detector_backend=DETECTOR_BACKEND,
    )
    rep = _first_item(representations)
    if not rep:
        return None

    embedding = rep.get('embedding')
    if not embedding:
        return None

    return [float(value) for value in embedding]