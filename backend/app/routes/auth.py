<<<<<<< HEAD
from typing import Union

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import get_bearer_token
from app.db.database import get_db
from app.models import Auth, Biometrie, Etudiant
from app.schemas import (
    FaceAuthRequest,
    FaceAuthResponse,
    FacePendingResponse,
    PinVerifyRequest,
    PinVerifyResponse,
    EtudiantOut,
)
from app.services.dbservice import verify_pin, create_token, get_token_data
from app.services.face_cache import face_cache
from app.services.unknown_faces_cache import unknown_faces_cache


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/face", response_model=Union[FaceAuthResponse, FacePendingResponse])
def face_auth(
    request: FaceAuthRequest,
    client_id: str = Header(..., alias="X-Client-ID"),
    db: Session = Depends(get_db),
):
=======
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.db.database import get_db
from typing import Union
from app.models import Auth, Biometrie, Etudiant
from app.schemas import FaceAuthRequest, FaceAuthResponse, FacePendingResponse, PinVerifyRequest, PinVerifyResponse, EtudiantOut, EtudiantMainOut
from app.services.dbservice import verify_pin, create_token, get_token_data
from app.services.face_cache import face_cache
from app.services.unknown_faces_cache import unknown_faces_cache
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/face", response_model=Union[FaceAuthResponse, FacePendingResponse])
def face_auth(  request: FaceAuthRequest,
                client_id: str = Header(..., alias="X-Client-ID"),
                db: Session = Depends(get_db) ):
    
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247
    embedding_vector = request.face_embedding
    metric = settings.FACE_METRIC.lower()
    threshold = settings.FACE_THRESHOLD

<<<<<<< HEAD
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
        raise HTTPException(
            status_code=500,
            detail="Unsupported FACE_METRIC in config",
        )

    result = (
        db.query(Biometrie, dist_expr.label("dist_score"))
        .order_by(order_expr)
        .first()
    )

    if not result:
        if unknown_faces_cache.register(embedding_vector):
            return FaceAuthResponse(
                access_token=None,
                token_type="Unauthorized",
                etudiant=None,
            )

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
        etudiant = (
            db.query(Etudiant)
            .filter(Etudiant.id_etudiant == consensus_user)
            .first()
        )

        if not etudiant:
            raise HTTPException(
                status_code=404,
                detail="Etudiant introuvable",
            )

        etudiant_out = EtudiantOut.model_validate(etudiant)

        token = create_token(
            {"sub": str(etudiant.id_etudiant), "role": "normal"}
        )

=======
    # Select distance expression & ordering direction based on metric
    if metric == "cosine":
        dist_expr = Biometrie.face_embedding.cosine_distance(embedding_vector)
        order_expr = dist_expr.asc()  # Lower distance = better match
    elif metric == "l2":
        dist_expr = Biometrie.face_embedding.l2_distance(embedding_vector)
        order_expr = dist_expr.asc()
    elif metric == "ip":  # Inner Product / Dot Product
        dist_expr = Biometrie.face_embedding.max_inner_product(embedding_vector)
        order_expr = dist_expr.desc()  # Higher product = better match
    else:
        raise HTTPException(status_code=500, detail="Unsupported FACE_METRIC in config")

    # 🔍 Efficient DB-side vector search: returns best match + its computed score
    result = db.query(Biometrie, dist_expr.label("dist_score")).order_by(order_expr).first()
    if not result:
        
        if unknown_faces_cache.register(embedding_vector):
            return FaceAuthResponse(
            access_token=None,
            token_type="Unauthorized",
            etudiant=None
        )

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
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247
        return FaceAuthResponse(
            access_token=token,
            token_type="bearer",
            etudiant={
<<<<<<< HEAD
                "nom": etudiant_out.nom,
                "prenom": etudiant_out.prenom,
                "date_naissance": etudiant_out.date_naissance,
                "sexe": etudiant_out.sexe,
                "filiere": etudiant_out.filiere,
                "id_etudiant": etudiant_out.id_etudiant,
            },
        )

    remaining = face_cache.threshold - current_votes

=======
                "nom" : EtudiantOut.model_validate(etudiant).nom,
                "prenom": EtudiantOut.model_validate(etudiant).prenom,
                "date_naissance": EtudiantOut.model_validate(etudiant).date_naissance,
                "sexe": EtudiantOut.model_validate(etudiant).sexe,
                "filiere": EtudiantOut.model_validate(etudiant).filiere,
                "id_etudiant": EtudiantOut.model_validate(etudiant).id_etudiant
                }
        )

    # ⏳ 3. Still waiting for consensus
    remaining = face_cache.threshold - current_votes
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247
    return FacePendingResponse(
        status="pending",
        progress=current_votes,
        matches_needed=remaining,
<<<<<<< HEAD
        message=f"En attente de {remaining} correspondance(s) supplémentaire(s)",
    )


@router.post("/pin/verify", response_model=PinVerifyResponse)
@limiter.limit("5/minute")
def verify_pin_access(
    http_request: Request,
    request: PinVerifyRequest,
    token: str = Depends(get_bearer_token),
    db: Session = Depends(get_db),
):
    data = get_token_data(token)

    if str(data.get("role")) != "normal":
        raise HTTPException(
            status_code=403,
            detail="Token normal requis",
        )

    if int(data.get("sub")) != request.id_etudiant:
        raise HTTPException(
            status_code=403,
            detail="Acces refuse",
        )
=======
        message=f"En attente de {remaining} correspondance(s) supplémentaire(s)"
    )

@router.post("/pin/verify", response_model=PinVerifyResponse)
def verify_pin_access(request: PinVerifyRequest, db: Session = Depends(get_db)):
    
    data = get_token_data(request.token)
    if int(data.get("sub")) != request.id_etudiant or str(data.get("role")) != "normal" :
        raise HTTPException(status_code=403, detail="Acces refuse")
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247

    auth = db.query(Auth).filter(Auth.id_etudiant == request.id_etudiant).first()

    if not auth or not auth.pin_hash:
<<<<<<< HEAD
        raise HTTPException(
            status_code=404,
            detail="PIN non configuré",
        )

    if not verify_pin(request.pin, auth.pin_hash):
        raise HTTPException(
            status_code=401,
            detail="PIN incorrect",
        )

    token_sensible = create_token(
        {"sub": str(request.id_etudiant), "role": "sensible"},
        expires_minutes=10,
    )

    return PinVerifyResponse(
        access_token_sensible=token_sensible,
        token_type="bearer",
    )
=======
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
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247
