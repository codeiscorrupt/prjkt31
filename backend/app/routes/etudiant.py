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

#Seance Prochaine
@router.get("/seance")
def get_session(
    id_etudiant: int,
    authorization: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db)
):
    data = get_token_data(authorization.split(" ")[1])  # Bearer <token>
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
def get_notes(
    id_etudiant: int,
    authorization: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db)
):
    data = get_token_data(authorization.split(" ")[1])
    if data.get("role") != "sensible" or int(data.get("sub")) != id_etudiant:
        raise HTTPException(status_code=403, detail="Acces refuse")

    return db.query(Note).filter(Note.id_etudiant == id_etudiant).all()


#Identite sensible (AVEC déchiffrement)
@router.get("/{id_etudiant}/sensible/identite")
def get_identite(
    id_etudiant: int,
    authorization: str = Header(..., alias="Authorization"),
    x_pin: str = Header(..., alias="X-Pin"),
    db: Session = Depends(get_db)
):

    data = get_token_data(authorization.split(" ")[1])
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
def get_absences(
    id_etudiant: int,
    authorization: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db)
):

    data = get_token_data(authorization.split(" ")[1])
    if data.get("role") != "sensible" or int(data.get("sub")) != id_etudiant:
        raise HTTPException(status_code=403, detail="Acces refuse")
    
    absences = db.query(Absence).filter(
        Absence.id_etudiant == id_etudiant
    ).all()
    print(absences[0].seance.module)
    return absences


# ─── Infos normales (avec déchiffrement) ─────────────────
@router.get("/{id_etudiant}", response_model=EtudiantOut)
def get_etudiant(
    id_etudiant: int,
    authorization: str = Header(..., alias="Authorization"),
    x_pin: str = Header(..., alias="X-Pin"),
    db: Session = Depends(get_db)
):

    data = get_token_data(authorization.split(" ")[1])
    if int(data.get("sub")) != id_etudiant:
        raise HTTPException(status_code=403, detail="Acces refuse")

    etudiant = db.query(Etudiant).filter(
        Etudiant.id_etudiant == id_etudiant
    ).first()

    if not etudiant:
        raise HTTPException(status_code=404, detail="Etudiant non trouve")

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
        }
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid PIN")

