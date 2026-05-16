from fastapi import APIRouter, Depends, HTTPException, Header , Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from typing import Union
from app.models import Auth, Biometrie, Etudiant
from app.schemas import FaceAuthRequest, FaceAuthResponse, FacePendingResponse, PinVerifyRequest, PinVerifyResponse, EtudiantOut, EtudiantMainOut
from app.services.dbservice import verify_pin, create_token, get_token_data
from app.services.face_cache import face_cache
from app.services.unknown_faces_cache import unknown_faces_cache
from app.core.config import settings
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from app.core.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/pin/verify", response_model=PinVerifyResponse)
@limiter.limit("5/minute")
def verify_pin_access(
    request: Request,
    pin_request: PinVerifyRequest,
    db: Session = Depends(get_db),
):
    data = get_token_data(pin_request.token)

    if int(data.get("sub")) != pin_request.id_etudiant or str(data.get("role")) != "normal":
        raise HTTPException(status_code=403, detail="Acces refuse")

    auth = db.query(Auth).filter(Auth.id_etudiant == pin_request.id_etudiant).first()

    if not auth or not auth.pin_hash:
        raise HTTPException(status_code=404, detail="PIN non configuré")

    if not verify_pin(pin_request.pin, auth.pin_hash):
        raise HTTPException(status_code=401, detail="PIN incorrect")

    token = create_token(
        {"sub": str(pin_request.id_etudiant), "role": "sensible"},
        expires_minutes=10,
    )

    return PinVerifyResponse(
        access_token_sensible=token,
        token_type="bearer",
    )