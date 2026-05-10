from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile , Request
from requests import Session
from app.services.authorization_service import run_target_authorization
from app.services.image_decoder import decode_uploaded_image
from app.db.database import get_db
from app.services.face_cache import face_cache
from app.core.rate_limit import limiter

router = APIRouter(tags=["authorization"])



@router.post('/authorize/reset')
def reset_authorization_cache(camera_id: str | None = Form(default=None)):
    client_key = camera_id or "default-client"
    face_cache.reset(client_key)
    return {
        "ok": True,
        "message": "Authorization cache reset",
        "client_key": client_key,
    }

@router.post('/authorize')
@limiter.limit("20/minute")
def authorize_target(
    request: Request,
    file: UploadFile = File(...),
    timestamp: str | None = Form(default=None),
    camera_id: str | None = Form(default=None),
    target_id: str | None = Form(default=None),
    db: Session = Depends(get_db)
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
            db=db
        )
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error: 
        raise HTTPException(status_code=500, detail=f'Authorization failed: {error}') from error
