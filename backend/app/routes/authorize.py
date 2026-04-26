from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from app.services.authorization_service import run_target_authorization
from app.services.image_decoder import decode_uploaded_image

router = APIRouter(tags=["authorization"])

@router.post('/authorize')
def authorize_target(
    file: UploadFile = File(...),
    timestamp: str | None = Form(default=None),
    camera_id: str | None = Form(default=None),
    target_id: str | None = Form(default=None),
):
    try:
        file_bytes = file.file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail='Uploaded image is empty.')

        frame = decode_uploaded_image(file_bytes)
        return run_target_authorization(
            frame,
            timestamp=timestamp,
            camera_id=camera_id,
            target_id=target_id,
        )
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f'Authorization failed: {error}') from error
