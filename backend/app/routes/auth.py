from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.db.database import get_db
from typing import Union
from app.models import Auth, Biometrie, Etudiant
from app.schemas import FaceAuthRequest, FaceAuthResponse, FacePendingResponse, PinVerifyRequest, PinVerifyResponse, EtudiantOut
from app.services.dbservice import verify_pin, create_token
from app.services.face_cache import face_cache
from app.core.config import settings
import numpy as np

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/face", response_model=Union[FaceAuthResponse, FacePendingResponse])
def face_auth(  request: FaceAuthRequest,
                client_id: str = Header(..., alias="X-Client-ID"),
                db: Session = Depends(get_db) ):
    
    embedding_vector = request.face_embedding
    metric = settings.FACE_METRIC.lower()
    threshold = settings.FACE_THRESHOLD

    # Select distance expression & ordering direction based on metric
    if metric == "cosine":
        dist_expr = Biometrie.face_embedding.cosine_distance(embedding_vector)
        order_expr = dist_expr.asc()  # Lower distance = better match
    elif metric == "l2":
        dist_expr = Biometrie.face_embedding.l2_distance(embedding_vector)
        order_expr = dist_expr.asc()
        print("embed compared")
    elif metric == "ip":  # Inner Product / Dot Product
        dist_expr = Biometrie.face_embedding.max_inner_product(embedding_vector)
        order_expr = dist_expr.desc()  # Higher product = better match
    else:
        raise HTTPException(status_code=500, detail="Unsupported FACE_METRIC in config")

    # 🔍 Efficient DB-side vector search: returns best match + its computed score
    result = db.query(Biometrie, dist_expr.label("dist_score")).order_by(order_expr).first()
    if not result:
        return FacePendingResponse(
            status="no_match", progress=0, matches_needed=0, 
            message="Aucune correspondance trouvée"
        )
    bio, score = result
    if score > threshold:
        return FacePendingResponse(
            status="no_match", progress=0, matches_needed=0, 
            message="Visage non reconnu"
        )

    # 🗳️ 2. Record in FIFO cache & check consensus
    consensus_user, current_votes = face_cache.record(client_id, bio.id_etudiant)

    if consensus_user:
        # ✅ Consensus reached → issue token
        etudiant = db.query(Etudiant).filter(Etudiant.id_etudiant == consensus_user).first()
        token = create_token({"sub": str(etudiant.id_etudiant), "role": "normal"})
        return FaceAuthResponse(
            access_token=token,
            token_type="bearer",
            etudiant=EtudiantOut.model_validate(etudiant)
        )

    # ⏳ 3. Still waiting for consensus
    remaining = face_cache.threshold - current_votes
    return FacePendingResponse(
        status="pending",
        progress=current_votes,
        matches_needed=remaining,
        message=f"En attente de {remaining} correspondance(s) supplémentaire(s)"
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
