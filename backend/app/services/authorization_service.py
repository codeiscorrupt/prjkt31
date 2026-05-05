import time
from typing import Any

import requests

from app.services.engines.deepface_engine import build_embedding


def extract_from_response(response: requests.Response):
    response.raise_for_status()
    return response.json()


def normalize_student(student: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": student.get("id") or student.get("id_etudiant"),
        "id_etudiant": student.get("id_etudiant") or student.get("id"),
        "nom": student.get("nom", ""),
        "prenom": student.get("prenom", ""),
        "email": student.get("email", ""),
        "department": student.get("department", student.get("filiere", "N/A")),
        "role": student.get("role", "Student"),
    }


def unknown_person() -> dict[str, Any]:
    return {
        "id": "UNKNOWN",
        "id_etudiant": None,
        "nom": "Unknown",
        "prenom": "target",
        "email": "N/A",
        "department": "N/A",
        "role": "Access denied",
    }


def run_target_authorization(
    frame,
    timestamp: str | None = None,
    camera_id: str | None = None,
    target_id: str | None = None,
) -> dict[str, Any]:
    start = time.perf_counter()
    height, width = frame.shape[:2]

    authorized = False
    message = "Access denied"
    person = unknown_person()
    confidence = 0.41

    try:
        url = "http://localhost:8000/auth/face"

        headers = {
            "Content-Type": "application/json",
            "X-Client-ID": "camera_device_abc123",
        }

        embedding = build_embedding(frame)

        payload = {
            "face_embedding": embedding,
        }

        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=15,
        )

        data = extract_from_response(response)

        if isinstance(data, dict) and "etudiant" in data:
            student = data.get("etudiant") or {}
            person = normalize_student(student)

            full_name = f"{person.get('nom', '')} {person.get('prenom', '')}".strip()
            message = f"Authorized access: {full_name or 'student'}"

            authorized = True
            confidence = 0.97

        elif isinstance(data, dict) and data.get("status") == "pending":
            message = "Authorization pending"
            authorized = False

        else:
            message = "Access denied"
            authorized = False

    except requests.exceptions.HTTPError as error:
        try:
            message = error.response.json().get("detail", "Authorization failed")
        except Exception:
            message = "Authorization failed"
        authorized = False

    except requests.exceptions.JSONDecodeError:
        message = "Authorization service returned invalid JSON"
        authorized = False

    except requests.exceptions.RequestException as error:
        message = f"Authorization network error: {error}"
        authorized = False

    except Exception as error:
        message = f"Authorization failed: {error}"
        authorized = False

    return {
        "ok": True,
        "authorized": authorized,
        "target_id": target_id or "target-demo-1",
        "message": message,
        "person": person,
        "confidence": confidence,
        "meta": {
            "processing_ms": round((time.perf_counter() - start) * 1000, 2),
            "camera_id": camera_id,
            "timestamp": timestamp,
            "frame_size": {
                "width": width,
                "height": height,
            },
        },
    }