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

@router.post("/face", response_model=Union[FaceAuthResponse, FacePendingResponse])
@limiter.limit("20/minute")
def face_auth(
    request: Request,
    face_request: FaceAuthRequest,
    client_id: str = Header(..., alias="X-Client-ID"),
    db: Session = Depends(get_db),
):
    embedding_vector = face_request.face_embedding
    metric = settings.FACE_METRIC.lower()
    threshold = settings.FACE_THRESHOLD

    if metric == "cosine":
        dist_expr = Biometrie.face_embedding.cosine_distance(embedding_vector)
        order_expr = dist_expr.asc()
    elif metric == "l2":
        dist_expr = Biometrie.face_embedding.l2_distance(embedding_vector)
        order_expr = dist_expr.asc()
    elif metric == "ip":
        dist_expr = Biometrie.face_embedding.max_inner_product(embedding_vector)
        order_expr = dist_expr.desc()
    else:
        raise HTTPException(status_code=500, detail="Unsupported FACE_METRIC in config")

    result = db.query(Biometrie, dist_expr.label("dist_score")).order_by(order_expr).first()

    if not result:
        if unknown_faces_cache.register(embedding_vector):
            raise HTTPException(status_code=401, detail="Unknown repeated face. Access denied.")

        return FacePendingResponse(
            status="no_match",
            progress=0,
            matches_needed=0,
            message="Aucune correspondance trouvée",
        )

    bio, score = result

    if score > threshold:
        return FacePendingResponse(
            status="no_match",
            progress=0,
            matches_needed=0,
            message="Visage non reconnu",
        )

    consensus_user, current_votes = face_cache.record(client_id, bio.id_etudiant)

    if consensus_user:
        etudiant = db.query(Etudiant).filter(Etudiant.id_etudiant == consensus_user).first()

        if not etudiant:
            raise HTTPException(status_code=404, detail="Etudiant introuvable")

        token = create_token({"sub": str(etudiant.id_etudiant), "role": "normal"})

        out = EtudiantOut.model_validate(etudiant)

        return FaceAuthResponse(
            access_token=token,
            token_type="bearer",
            etudiant=EtudiantMainOut(
                id_etudiant=out.id_etudiant,
                nom=out.nom,
                prenom=out.prenom,
                date_naissance=out.date_naissance,
                sexe=out.sexe,
                filiere=out.filiere,
            ),
        )

    remaining = face_cache.threshold - current_votes

    return FacePendingResponse(
        status="pending",
        progress=current_votes,
        matches_needed=remaining,
        message=f"En attente de {remaining} correspondance(s) supplémentaire(s)",
    )


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