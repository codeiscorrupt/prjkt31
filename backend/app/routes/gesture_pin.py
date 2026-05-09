from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool

from app.services.hand_gesture_service import MediaPipeHandGestureTracker
from app.services.image_decoder import decode_uploaded_image

router = APIRouter(tags=["gesture-pin"])


@router.websocket("/ws/gesture-pin")
async def ws_gesture_pin(websocket: WebSocket):
    await websocket.accept()

    tracker = MediaPipeHandGestureTracker(
        min_hand_detection_confidence=0.45,
        min_hand_presence_confidence=0.45,
        min_tracking_confidence=0.55,
    )

    await websocket.send_json({
        "type": "gesture_status",
        "hand_detected": False,
        "gesture": "connected",
        "cursor": None,
        "click": False,
        "confidence": 0,
        "error": "" if tracker.ready else "MediaPipe HandLandmarker is not ready",
    })

    try:
        while True:
            frame_bytes = await websocket.receive_bytes()

            if not frame_bytes:
                await websocket.send_json({
                    "type": "gesture",
                    "hand_detected": False,
                    "gesture": "empty_frame",
                    "cursor": None,
                    "click": False,
                    "confidence": 0,
                    "error": "Received empty frame",
                })
                continue

            try:
                frame = decode_uploaded_image(frame_bytes)
            except Exception as exc:
                await websocket.send_json({
                    "type": "gesture",
                    "hand_detected": False,
                    "gesture": "decode_error",
                    "cursor": None,
                    "click": False,
                    "confidence": 0,
                    "error": f"Frame decode failed: {exc}",
                })
                continue

            result = await run_in_threadpool(tracker.analyze, frame)
            payload = result.to_dict()
            payload["type"] = "gesture"

            await websocket.send_json(payload)

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({
                "type": "gesture",
                "hand_detected": False,
                "gesture": "error",
                "cursor": None,
                "click": False,
                "confidence": 0,
                "error": f"Gesture PIN failed: {exc}",
            })
        except Exception:
            pass
    finally:
        tracker.close()