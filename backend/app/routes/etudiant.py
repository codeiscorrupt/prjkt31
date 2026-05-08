<<<<<<< HEAD
import os
import shutil

from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Header,
)

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.core.security import (
    get_bearer_token,
    verify_admin_key,
)

from app.db.database import get_db

from app.models import (
    Etudiant,
    Identite,
    Note,
    Absence,
    Auth,
    Biometrie,
    Seance,
)

from app.schemas import (
    EtudiantOut,
    RegisterRequest,
    RegisterResponse,
)

from app.services.dbservice import (
    hash_pin,
    get_token_data,
)

from app.services.crypto_service import (
    encrypt_field,
    decrypt_field,
)


router = APIRouter(
    prefix="/etudiant",
    tags=["Etudiant"],
)


# ─────────────────────────────────────────────
# REGISTER ADMIN ONLY
# ─────────────────────────────────────────────

@router.post("/register", response_model=RegisterResponse)
def register_etudiant(
    request: RegisterRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_key),
):
    pin = request.pin
=======
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Etudiant, Identite, Note, Absence, Auth, Biometrie, Seance
from app.schemas import EtudiantOut, RegisterRequest, RegisterResponse
from app.services.dbservice import hash_pin, get_token_data
from app.services.crypto_service import encrypt_field, decrypt_field
from datetime import datetime, timezone

import shutil, os, json

router = APIRouter(prefix="/etudiant", tags=["Etudiant"])

# ─── Register ───────────────────────────────────────────
@router.post("/register", response_model=RegisterResponse)
def register_etudiant(request: RegisterRequest, db: Session = Depends(get_db)):

    pin = request.pin  #utilisé pour chiffrement
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247

    etudiant = Etudiant(
        nom=request.nom,
        prenom=request.prenom,
        email=encrypt_field(request.email, pin),
        filiere=request.filiere,
        date_naissance=request.date_naissance,
        sexe=request.sexe,
        telephone=encrypt_field(request.telephone, pin),
<<<<<<< HEAD
        adresse=encrypt_field(request.adresse, pin),
    )

    db.add(etudiant)
    db.flush()

    auth = Auth(
        id_etudiant=etudiant.id_etudiant,
        role="etudiant",
        pin_hash=hash_pin(request.pin),
    )

    db.add(auth)

    # Embedding stocke uniquement en base
    # Jamais retourne au frontend
    bio = Biometrie(
        id_etudiant=etudiant.id_etudiant,
        face_embedding=request.face_embedding,
    )

    db.add(bio)

    if request.cne or request.cin:
        identite = Identite(
            id_etudiant=etudiant.id_etudiant,
            cne=encrypt_field(request.cne, pin)
            if request.cne
            else None,
            cin=encrypt_field(request.cin, pin)
            if request.cin
            else None,
        )

        db.add(identite)

=======
        adresse=encrypt_field(request.adresse, pin)
    )
    db.add(etudiant)
    db.flush()

    #PIN hashé (comme déjà fait)
    auth = Auth(
        id_etudiant=etudiant.id_etudiant,
        role="etudiant",
        pin_hash=hash_pin(request.pin)
    )
    db.add(auth)

    #BIOMETRIE chiffrée
    bio = Biometrie(
        id_etudiant=etudiant.id_etudiant,
        face_embedding=request.face_embedding
    )
    db.add(bio)

    #IDENTITE chiffrée
    if request.cne or request.cin:
        identite = Identite(
            id_etudiant=etudiant.id_etudiant,
            cne=encrypt_field(request.cne, pin) if request.cne else None,
            cin=encrypt_field(request.cin, pin) if request.cin else None
        )
        db.add(identite)

    #NOTES NON CHIFFRÉES
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247
    if request.notes:
        for n in request.notes:
            note = Note(
                id_etudiant=etudiant.id_etudiant,
                module=n.get("module"),
                note=n.get("note"),
                session=n.get("session"),
<<<<<<< HEAD
                annee=n.get("annee"),
            )

            db.add(note)

    db.commit()

    return RegisterResponse(
        message="Etudiant enregistre avec succes",
        id_etudiant=etudiant.id_etudiant,
    )


# ─────────────────────────────────────────────
# PROCHAINE SEANCE
# ─────────────────────────────────────────────

@router.get("/seance")
def get_session(
    id_etudiant: int,
    token: str = Depends(get_bearer_token),
    db: Session = Depends(get_db),
):
    data = get_token_data(token)

    if int(data.get("sub")) != id_etudiant:
        raise HTTPException(
            status_code=403,
            detail="Acces refuse",
        )

    etudiant = (
        db.query(Etudiant)
        .filter(Etudiant.id_etudiant == id_etudiant)
        .first()
    )

    if not etudiant:
        raise HTTPException(
            status_code=404,
            detail="Etudiant non trouve",
        )

    date_time = datetime.now(timezone.utc)

    current_time = date_time.time().replace(microsecond=0)
    current_date = date_time.date()

    seance = (
        db.query(Seance)
        .filter(
            Seance.filiere == etudiant.filiere,
            or_(
                and_(
                    Seance.date_seance == current_date,
                    Seance.heure_fin > current_time,
                ),
                Seance.date_seance > current_date,
            ),
        )
        .order_by(
            Seance.date_seance.asc(),
            Seance.heure_debut.asc(),
        )
        .first()
    )

    return {"seance": seance}


# ─────────────────────────────────────────────
# NOTES SENSIBLES
# ─────────────────────────────────────────────

@router.get("/{id_etudiant}/sensible/notes")
def get_notes(
    id_etudiant: int,
    token: str = Depends(get_bearer_token),
    db: Session = Depends(get_db),
):
    data = get_token_data(token)

    if (
        data.get("role") != "sensible"
        or int(data.get("sub")) != id_etudiant
    ):
        raise HTTPException(
            status_code=403,
            detail="Acces refuse",
        )

    return (
        db.query(Note)
        .filter(Note.id_etudiant == id_etudiant)
        .all()
    )


# ─────────────────────────────────────────────
# IDENTITE SENSIBLE
# ─────────────────────────────────────────────

@router.get("/{id_etudiant}/sensible/identite")
def get_identite(
    id_etudiant: int,
    token: str = Depends(get_bearer_token),
    x_pin: str = Header(..., alias="X-Pin"),
    db: Session = Depends(get_db),
):
    data = get_token_data(token)

    if (
        data.get("role") != "sensible"
        or int(data.get("sub")) != id_etudiant
    ):
        raise HTTPException(
            status_code=403,
            detail="Acces refuse",
        )

    identite = (
        db.query(Identite)
        .filter(Identite.id_etudiant == id_etudiant)
        .first()
    )

    if not identite:
        raise HTTPException(
            status_code=404,
            detail="Identite non trouvee",
        )

    try:
        return {
            "cne": decrypt_field(identite.cne, x_pin)
            if identite.cne
            else None,

            "cin": decrypt_field(identite.cin, x_pin)
            if identite.cin
            else None,
        }

    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid PIN",
        )


# ─────────────────────────────────────────────
# ABSENCES
# ─────────────────────────────────────────────

@router.get("/{id_etudiant}/sensible/absences")
def get_absences(
    id_etudiant: int,
    token: str = Depends(get_bearer_token),
    db: Session = Depends(get_db),
):
    data = get_token_data(token)

    if (
        data.get("role") != "sensible"
        or int(data.get("sub")) != id_etudiant
    ):
        raise HTTPException(
            status_code=403,
            detail="Acces refuse",
        )

    return (
        db.query(Absence)
        .filter(Absence.id_etudiant == id_etudiant)
        .all()
    )


# ─────────────────────────────────────────────
# UPLOAD PHOTO
# ─────────────────────────────────────────────

@router.post("/{id_etudiant}/photo")
def upload_photo(
    id_etudiant: int,
    token: str = Depends(get_bearer_token),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    data = get_token_data(token)

    if int(data.get("sub")) != id_etudiant:
        raise HTTPException(
            status_code=403,
            detail="Acces refuse",
        )

    etudiant = (
        db.query(Etudiant)
        .filter(Etudiant.id_etudiant == id_etudiant)
        .first()
    )

    if not etudiant:
        raise HTTPException(
            status_code=404,
            detail="Etudiant non trouve",
        )

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Type image invalide",
        )

    file_bytes = file.file.read()

    if len(file_bytes) > 3 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image trop volumineuse",
        )

    ext = file.filename.split(".")[-1].lower()

    filename = f"etudiant_{id_etudiant}.{ext}"

    upload_dir = os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "uploads",
        "photos",
    )

    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as buffer:
        buffer.write(file_bytes)

    etudiant.photo_url = f"/uploads/photos/{filename}"

    db.commit()

    return {
        "message": "Photo uploadee avec succes",
        "photo_url": etudiant.photo_url,
    }


# ─────────────────────────────────────────────
# INFOS ETUDIANT
# ─────────────────────────────────────────────

@router.get("/{id_etudiant}", response_model=EtudiantOut)
def get_etudiant(
    id_etudiant: int,
    token: str = Depends(get_bearer_token),
    x_pin: str = Header(..., alias="X-Pin"),
    db: Session = Depends(get_db),
):
    data = get_token_data(token)

    if int(data.get("sub")) != id_etudiant:
        raise HTTPException(
            status_code=403,
            detail="Acces refuse",
        )

    etudiant = (
        db.query(Etudiant)
        .filter(Etudiant.id_etudiant == id_etudiant)
        .first()
    )

    if not etudiant:
        raise HTTPException(
            status_code=404,
            detail="Etudiant non trouve",
        )
=======
                annee=n.get("annee")
            )
            db.add(note)

    db.commit()
    return RegisterResponse(
        message="Etudiant enregistre avec succes",
        id_etudiant=etudiant.id_etudiant
    )


#Seance Prochaine
@router.get("/seance")
def get_session(id_etudiant: int, token: str, db: Session = Depends(get_db)):
    data = get_token_data(token)
    if int(data.get("sub")) != id_etudiant:
        raise HTTPException(status_code=403, detail="Acces refuse")
    
    etudiant = db.query(Etudiant).filter(
        Etudiant.id_etudiant == id_etudiant
    ).first()

    if not etudiant:
        raise HTTPException(status_code=404, detail="Etudiant non trouvee")
    
    date_time = datetime.now(timezone.utc)
    current_time = date_time.time().replace(microsecond=0)
    current_date = date_time.date()

    try:
        seance = db.query(Seance).filter(
            Seance.filiere == etudiant.filiere,
            or_(
                and_(Seance.date_seance == current_date, Seance.heure_fin > current_time),
                (Seance.date_seance > current_date)
                )
            ).order_by(Seance.date_seance.asc(), Seance.heure_debut.asc()).first()
        return {"seance" : seance} 
       
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid PIN")

#Notes sensibles (NON chiffrées)
@router.get("/{id_etudiant}/sensible/notes")
def get_notes(id_etudiant: int, token: str, db: Session = Depends(get_db)):

    data = get_token_data(token)
    if data.get("role") != "sensible" or int(data.get("sub")) != id_etudiant:
        raise HTTPException(status_code=403, detail="Acces refuse")

    return db.query(Note).filter(Note.id_etudiant == id_etudiant).all()


#Identite sensible (AVEC déchiffrement)
@router.get("/{id_etudiant}/sensible/identite")
def get_identite(id_etudiant: int, token: str, x_pin: str = Header(..., alias="X-Pin"), db: Session = Depends(get_db)):

    data = get_token_data(token)
    if data.get("role") != "sensible" or int(data.get("sub")) != id_etudiant:
        raise HTTPException(status_code=403, detail="Acces refuse")

    identite = db.query(Identite).filter(
        Identite.id_etudiant == id_etudiant
    ).first()

    if not identite:
        raise HTTPException(status_code=404, detail="Identite non trouvee")

    try:
        return {
            "cne": decrypt_field(identite.cne, x_pin) if identite.cne else None,
            "cin": decrypt_field(identite.cin, x_pin) if identite.cin else None
        }
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid PIN")


#Absences
@router.get("/{id_etudiant}/sensible/absences")
def get_absences(id_etudiant: int, token: str, db: Session = Depends(get_db)):

    data = get_token_data(token)
    if data.get("role") != "sensible" or int(data.get("sub")) != id_etudiant:
        raise HTTPException(status_code=403, detail="Acces refuse")

    return db.query(Absence).filter(
        Absence.id_etudiant == id_etudiant
    ).all()

# ─── photo ─────────────────────────────────

@router.post("/{id_etudiant}/photo")
def upload_photo(id_etudiant: int, token: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    data = get_token_data(token)
    if int(data.get("sub")) != id_etudiant:
        raise HTTPException(status_code=403, detail="Acces refuse")

    # Vérifier que l'étudiant existe
    etudiant = db.query(Etudiant).filter(Etudiant.id_etudiant == id_etudiant).first()
    if not etudiant:
        raise HTTPException(status_code=404, detail="Etudiant non trouve")

    # Vérifier que c'est bien une image
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Fichier doit etre une image")

    # Sauvegarder le fichier
    ext = file.filename.split(".")[-1]
    filename = f"etudiant_{id_etudiant}.{ext}"
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "photos")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Sauvegarder le chemin en BDD
    etudiant.photo_url = f"/uploads/photos/{filename}"
    db.commit()

    return {"message": "Photo uploadee avec succes", "photo_url": etudiant.photo_url}

# ─── Infos normales (avec déchiffrement) ─────────────────
@router.get("/{id_etudiant}", response_model=EtudiantOut)
def get_etudiant(id_etudiant: int, token: str, x_pin: str = Header(..., alias="X-Pin"), db: Session = Depends(get_db)):

    data = get_token_data(token)
    if int(data.get("sub")) != id_etudiant:
        raise HTTPException(status_code=403, detail="Acces refuse")

    etudiant = db.query(Etudiant).filter(
        Etudiant.id_etudiant == id_etudiant
    ).first()

    if not etudiant:
        raise HTTPException(status_code=404, detail="Etudiant non trouve")
>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247

    try:
        return {
            "id_etudiant": etudiant.id_etudiant,
            "nom": etudiant.nom,
            "prenom": etudiant.prenom,
            "email": decrypt_field(etudiant.email, x_pin),
            "filiere": etudiant.filiere,
            "date_naissance": etudiant.date_naissance,
            "sexe": etudiant.sexe,
            "telephone": decrypt_field(etudiant.telephone, x_pin),
            "adresse": decrypt_field(etudiant.adresse, x_pin),
<<<<<<< HEAD
            "photo_url": etudiant.photo_url,
        }

    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid PIN",
        )
=======
            "photo_url": etudiant.photo_url
        }
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid PIN")

>>>>>>> bcc8c0c454eee9ac371939774e96b642ec9f5247
