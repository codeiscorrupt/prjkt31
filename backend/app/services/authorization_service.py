import requests, time
from typing import Any
from app.services.engines.deepface_engine import build_embedding
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Biometrie, Etudiant
from app.schemas import EtudiantMainOut, EtudiantOut, FaceAuthResponse, FacePendingResponse
from app.services.dbservice import create_token
from app.services.face_cache import face_cache
from app.services.unknown_faces_cache import unknown_faces_cache
from app.core.config import settings


def extract_from_response(response: requests.Response):
    response.raise_for_status()
    return response.json()


def run_target_authorization(
    frame,
    timestamp: str | None = None,
    camera_id: str | None = None,
    target_id: str | None = None,
    db: Session = None
) -> dict[str, Any]:

    start = time.perf_counter()
    height, width = frame.shape[:2]
    authorized = 0
    token = None
    embedding = build_embedding(frame)
    try:
        if embedding:
            client_key = camera_id or target_id or "default-client"
            response = face_auth(embedding, client_id=client_key, db=db)
            data = response.model_dump()

            if data:
                # Person recognized: authorized = 1
                if "etudiant" in data.keys() and data["etudiant"]:
                    student = data.get("etudiant")
                    print(f"✅ Recognized as {student['nom']} {student['prenom']}")
                    msg = f"✅ Utilisateur Reconnu : {student['nom']} {student['prenom']}"
                    token = data.get("access_token")
                    authorized = 1

                # Person not recognized yet: authorized = 0
                elif data.get("status") == "pending" or data.get("status") == "no_match":
                    msg = data

                # Person not recognized and access not permitted: authorized = 2
                else:
                    authorized = 2
            # no embed data or corrupted response
            else:
                authorized = 0
        # no embed in the picture        
        else:
            authorized = 0
        
    except requests.exceptions.HTTPError as e:
        error_msg = e.response.json().get("detail", "Unknown error")
        print(f"❌ Auth failed: {error_msg}")
        msg = "error"
    except requests.exceptions.JSONDecodeError:
        print("❌ Response was not valid JSON")
        msg = "error"
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        msg = "error"

    if authorized == 1:
        message = str(msg) if msg else "Authorized"
        person = student

    elif authorized == 0:
        message = "Pending Authorization"
        person = {
            'id': 'UNKNOWN',
            'name': 'Unknown target'
        }

    else:
        message = "Unknown User: Access Unauthorized"
        person = {
            'id': 'UNKNOWN',
            'name': 'Unknown target'
        }

    output =   {
        'token': token if token else None,
        'authorized': authorized,
        'target_id': target_id or 'target-demo-1',
        'message': message,
        'person': person,
        'meta': {
            'processing_ms': round((time.perf_counter() - start) * 1000, 2),
            'camera_id': camera_id,
            'timestamp': timestamp,
            'frame_size': {'width': width, 'height': height}
            } 
        }
    print("processing time = ", output["meta"]["processing_ms"])
    return output

def face_auth(face_embedding: list[float], client_id: str = "client_id", db: Session = None):
    embedding_vector = face_embedding
    metric = settings.FACE_METRIC.lower()
    threshold = settings.FACE_THRESHOLD
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
    print("distance = : ", score)
    if score > threshold:
        if unknown_faces_cache.register(embedding_vector):
            return FaceAuthResponse(
            access_token=None,
            token_type="Unauthorized",
            etudiant=None
        )

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
            etudiant=EtudiantMainOut(
                id_etudiant=EtudiantOut.model_validate(etudiant).id_etudiant,
                nom=EtudiantOut.model_validate(etudiant).nom,
                prenom=EtudiantOut.model_validate(etudiant).prenom,
                date_naissance=EtudiantOut.model_validate(etudiant).date_naissance,
                sexe=EtudiantOut.model_validate(etudiant).sexe,
                filiere=EtudiantOut.model_validate(etudiant).filiere,
            )
        )

    # ⏳ 3. Still waiting for consensus
    remaining = face_cache.threshold - current_votes
    return FacePendingResponse(
        status="pending",
        progress=current_votes,
        matches_needed=remaining,
        message=f"En attente de {remaining} correspondance(s) supplémentaire(s)"
    )
