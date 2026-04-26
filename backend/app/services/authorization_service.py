import numpy as np, cv2, requests, time
from datetime import datetime
from typing import Any
from deepface import DeepFace
from app.services.engines.deepface_engine import build_embedding, _resize_for_analysis, _first_item


def extract_from_response(response: requests.Response):
    response.raise_for_status()
    return response.json()


def run_target_authorization(
    frame,
    timestamp: str | None = None,
    camera_id: str | None = None,
    target_id: str | None = None,
) -> dict[str, Any]:

    start = time.perf_counter()
    height, width = frame.shape[:2]
    authorized = 0

    embedding = build_embedding(frame)

    try:
        url = "http://localhost:8000/auth/face"

        headers = {
            "Content-Type": "application/json",
            "X-Client-ID": "camera_device_abc123"
        }

        payload = {"face_embedding" : embedding}

        response = requests.post(url, headers=headers, json=payload)
        print(response)
        data = extract_from_response(response)
        
        student = data["etudiant"]
        print(f"✅ Logged in as {student['nom']} {student['prenom']}")
        msg = student['nom']
        authorized = 1
        
    except requests.exceptions.HTTPError as e:
        error_msg = e.response.json().get("detail", "Unknown error")
        print(f"❌ Auth failed: {error_msg}")
        msg = "error"
    except requests.exceptions.JSONDecodeError:
        print("❌ Response was not valid JSON")
        msg = "error"
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        msg = "error"

    if authorized:
        message = msg,
        person = student
    else:
        message = response if response else msg,
        person = {
            'id': 'UNKNOWN',
            'name': 'Unknown target',
            'department': 'N/A',
            'role': 'Access denied',
            'email': 'N/A',
        }

    return {
        'ok': True,
        'authorized': authorized,
        'target_id': target_id or 'target-demo-1',
        'message': message,
        'person': person,
        'confidence': 0.97 if authorized else 0.41,
        'meta': {
            'processing_ms': round((time.perf_counter() - start) * 1000, 2),
            'camera_id': camera_id,
            'timestamp': timestamp,
            'frame_size': {'width': width, 'height': height},
        },
    }
