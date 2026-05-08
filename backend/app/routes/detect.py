from fastapi import APIRouter, File, Form, HTTPException, UploadFile
<<<<<<< HEAD

from app.services.detection_service import run_person_detection
from app.services.image_decoder import decode_uploaded_image


router = APIRouter(tags=["detection"])


@router.post("/detect")
=======
from app.services.detection_service import run_person_detection
from app.services.image_decoder import decode_uploaded_image

router = APIRouter(tags=["detection"])

@router.post('/detect')
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247
def detect_people(
    file: UploadFile = File(...),
    timestamp: str | None = Form(default=None),
    camera_id: str | None = Form(default=None),
):
    try:
<<<<<<< HEAD
        allowed_types = {
            "image/jpeg",
            "image/png",
            "image/webp",
        }

        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid image type",
            )

        file_bytes = file.file.read()

        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail="Uploaded image is empty.",
            )

        if len(file_bytes) > 3 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="Image too large",
            )

        frame = decode_uploaded_image(file_bytes)

        return run_person_detection(
            frame,
            timestamp=timestamp,
            camera_id=camera_id,
        )

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Detection failed: {error}",
        ) from error
=======
        file_bytes = file.file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail='Uploaded image is empty.')

        frame = decode_uploaded_image(file_bytes)
        return run_person_detection(frame, timestamp=timestamp, camera_id=camera_id)
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f'Detection failed: {error}') from error
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247
