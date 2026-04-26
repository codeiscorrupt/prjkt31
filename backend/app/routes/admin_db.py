# routers/admin.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Etudiant, Auth, Biometrie, Identite, Seance, Absence, Note
from app.services.dbservice import hash_pin, verify_admin_key
from app.schemas import (
    RegisterRequest, RegisterResponse,
    SeanceCreate, SeanceOut,
    AbsenceCreate, AbsenceOut,
    NoteCreate, NoteOut
)


router = APIRouter(prefix="/admin", tags=["Administration"])

@router.post("/register", response_model=RegisterResponse, dependencies=[Depends(verify_admin_key)])
def admin_register_student(request: RegisterRequest, db: Session = Depends(get_db)):
    # 1. Check for existing email
    if db.query(Etudiant).filter(Etudiant.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email deja utilise")

    # 2. Create Student
    etudiant = Etudiant(
        nom=request.nom, prenom=request.prenom, email=request.email,
        filiere=request.filiere, date_naissance=request.date_naissance,
        sexe=request.sexe, telephone=request.telephone, adresse=request.adresse
    )
    db.add(etudiant)
    db.flush()  # ⚠️ Crucial: generates id_etudiant so child tables can reference it

    # 3. Create Authentication (PIN)
    auth = Auth(
        id_etudiant=etudiant.id_etudiant,
        role="etudiant",
        pin_hash=hash_pin(request.pin)
    )
    db.add(auth)

    # 4. Create Biometrics
    # pgvector natively accepts list[float], no string conversion needed
    bio = Biometrie(
        id_etudiant=etudiant.id_etudiant,
        face_embedding=request.face_embedding
    )
    db.add(bio)

    # 5. Create Identity (if provided)
    if request.cne or request.cin:
        identite = Identite(
            id_etudiant=etudiant.id_etudiant,
            cne=request.cne,
            cin=request.cin
        )
        db.add(identite)

    # 6. Create Initial Grades/Notes (if provided)
    if request.notes:
        for n in request.notes:
            note = Note(
                id_etudiant=etudiant.id_etudiant,
                module=n.get("module"),
                note=n.get("note"),
                session=n.get("session"),
                annee=n.get("annee")
            )
            db.add(note)

    db.commit()
    return {"message": "Etudiant enregistre avec succes", "id_etudiant": etudiant.id_etudiant}


@router.post("/seances", response_model=SeanceOut, dependencies=[Depends(verify_admin_key)])
def create_seance(data: SeanceCreate, db: Session = Depends(get_db)):
    # Pydantic v2: .model_dump() | v1: .dict()
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    seance = Seance(**payload)
    db.add(seance)
    db.commit()
    db.refresh(seance)
    return seance


@router.post("/absences", response_model=AbsenceOut, dependencies=[Depends(verify_admin_key)])
def create_absence(data: AbsenceCreate, db: Session = Depends(get_db)):
    # 🔒 Foreign Key Validation
    if not db.query(Etudiant).get(data.id_etudiant):
        raise HTTPException(status_code=404, detail="Etudiant non trouve")
    if not db.query(Seance).get(data.id_seance):
        raise HTTPException(status_code=404, detail="Seance non trouvee")

    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    absence = Absence(**payload)
    db.add(absence)
    db.commit()
    db.refresh(absence)
    return absence


@router.post("/notes", response_model=NoteOut, dependencies=[Depends(verify_admin_key)])
def create_note(data: NoteCreate, db: Session = Depends(get_db)):
    if not db.query(Etudiant).get(data.id_etudiant):
        raise HTTPException(status_code=404, detail="Etudiant non trouve")

    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    note = Note(**payload)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note