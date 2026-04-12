from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Auth, Biometrie, Etudiant
from app.schemas import FaceAuthRequest, FaceAuthResponse, PinVerifyRequest, PinVerifyResponse, EtudiantOut
from app.services.auth import verify_pin, create_token
import numpy as np

router = APIRouter(prefix="/auth", tags=["Authentication"])

def cosine_similarity(v1, v2):
    v1, v2 = np.array(v1), np.array(v2)
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

@router.post("/face", response_model=FaceAuthResponse)
def face_auth(request: FaceAuthRequest, db: Session = Depends(get_db)):
    embeddings = db.query(Biometrie).all()
    best_match = None
    best_score = -1

    for bio in embeddings:
        stored = list(map(float, bio.face_embedding.strip("[]").split(",")))
        score = cosine_similarity(request.face_embedding, stored)
        if score > best_score:
            best_score = score
            best_match = bio

    if best_match is None or best_score < 0.85:
        raise HTTPException(status_code=401, detail="Visage non reconnu")

    etudiant = db.query(Etudiant).filter(
        Etudiant.id_etudiant == best_match.id_etudiant
    ).first()

    token = create_token({"sub": str(etudiant.id_etudiant), "role": "normal"})

    return FaceAuthResponse(
        access_token=token,
        token_type="bearer",
        etudiant=EtudiantOut.from_orm(etudiant)
    )

@router.post("/pin/verify", response_model=PinVerifyResponse)
def verify_pin_access(request: PinVerifyRequest, db: Session = Depends(get_db)):
    auth = db.query(Auth).filter(Auth.id_etudiant == request.id_etudiant).first()

    if not auth or not auth.pin_hash:
        raise HTTPException(status_code=404, detail="PIN non configuré")

    if not verify_pin(request.pin, auth.pin_hash):
        raise HTTPException(status_code=401, detail="PIN incorrect")

    token = create_token(
        {"sub": str(request.id_etudiant), "role": "sensible"},
        expires_minutes=10
    )

    return PinVerifyResponse(
        access_token_sensible=token,
        token_type="bearer"
    )
