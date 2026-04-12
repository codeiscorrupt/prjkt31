from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from app.db.database import get_db
from app.models import Etudiant, Identite, Note, Absence, Auth, Biometrie
from app.schemas import EtudiantOut, RegisterRequest, RegisterResponse
from app.core.config import settings
from app.services.auth import hash_pin
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import shutil, os
import numpy as np

router = APIRouter(prefix="/etudiant", tags=["Etudiant"])

def get_token_data(token: str):
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ─── Register ───────────────────────────────────────────
@router.post("/register", response_model=RegisterResponse)
def register_etudiant(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(Etudiant).filter(Etudiant.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email deja utilise")

    etudiant = Etudiant(
        nom=request.nom, prenom=request.prenom, email=request.email,
        filiere=request.filiere, date_naissance=request.date_naissance,
        sexe=request.sexe, telephone=request.telephone, adresse=request.adresse
    )
    db.add(etudiant)
    db.flush()

    auth = Auth(
        id_etudiant=etudiant.id_etudiant,
        role="etudiant",
        pin_hash=hash_pin(request.pin)
    )
    db.add(auth)

    embedding = np.random.rand(128).astype(float)
    embedding = embedding / np.linalg.norm(embedding)
    embedding_str = "[" + ",".join(map(str, embedding.tolist())) + "]"
    bio = Biometrie(id_etudiant=etudiant.id_etudiant, face_embedding=embedding_str)
    db.add(bio)

    if request.cne or request.cin:
        identite = Identite(id_etudiant=etudiant.id_etudiant, cne=request.cne, cin=request.cin)
        db.add(identite)

    if request.notes:
        for n in request.notes:
            note = Note(
                id_etudiant=etudiant.id_etudiant,
                module=n.get("module"), note=n.get("note"),
                session=n.get("session"), annee=n.get("annee")
            )
            db.add(note)

    db.commit()
    return RegisterResponse(
        message="Etudiant enregistre avec succes",
        id_etudiant=etudiant.id_etudiant
    )


# ─── Infos normales ────────────────────────────────────-
@router.get("/{id_etudiant}", response_model=EtudiantOut)
def get_etudiant(id_etudiant: int, token: str, db: Session = Depends(get_db)):
    data = get_token_data(token)
    if int(data.get("sub")) != id_etudiant:
        raise HTTPException(status_code=403, detail="Acces refuse")
    etudiant = db.query(Etudiant).filter(
        Etudiant.id_etudiant == id_etudiant
    ).first()
    if not etudiant:
        raise HTTPException(status_code=404, detail="Etudiant non trouve")
    return etudiant

# ─── Notes sensibles ────────────────────────────────────
@router.get("/{id_etudiant}/sensible/notes")
def get_notes(id_etudiant: int, token: str, db: Session = Depends(get_db)):
    data = get_token_data(token)
    if data.get("role") != "sensible" or int(data.get("sub")) != id_etudiant:
        raise HTTPException(status_code=403, detail="Acces refuse")
    return db.query(Note).filter(Note.id_etudiant == id_etudiant).all()

# ─── Identite sensible ──────────────────────────────────
@router.get("/{id_etudiant}/sensible/identite")
def get_identite(id_etudiant: int, token: str, db: Session = Depends(get_db)):
    data = get_token_data(token)
    if data.get("role") != "sensible" or int(data.get("sub")) != id_etudiant:
        raise HTTPException(status_code=403, detail="Acces refuse")
    identite = db.query(Identite).filter(
        Identite.id_etudiant == id_etudiant
    ).first()
    if not identite:
        raise HTTPException(status_code=404, detail="Identite non trouvee")
    return identite

# ─── Absences sensibles ─────────────────────────────────
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
