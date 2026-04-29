from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi.concurrency import run_in_threadpool
from app.services.detection_service import run_person_detection
from app.services.image_decoder import decode_uploaded_image

router = APIRouter(tags=["detection"])

@router.websocket("/ws/detect")
async def ws_detect_people(
    websocket: WebSocket,
    camera_id: str | None = Query(default=None),
    timestamp: str | None = Query(default=None),
):
    await websocket.accept()
    try:
        while True:
            # 1. Receive raw JPEG/PNG bytes from the frontend
            frame_bytes = await websocket.receive_bytes()
            if not frame_bytes:
                continue

            # 2. Decode image & run sync detection
            # ⚠️ run_in_threadpool is CRUCIAL: it prevents your sync model 
            # from blocking FastAPI's async event loop.
            frame = decode_uploaded_image(frame_bytes)
            detections = await run_in_threadpool(
                run_person_detection, frame, timestamp, camera_id
            )

            # 3. Send result back as JSON
            await websocket.send_json(detections)

    except WebSocketDisconnect:
        pass  # Client disconnected gracefully
    except Exception as e:
        # Instead of crashing the connection, send error details to the client
        await websocket.send_json({"error": f"Detection failed: {e}"})