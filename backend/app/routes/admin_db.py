from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Etudiant, Auth, Biometrie, Identite, Seance, Absence, Note
from app.services.dbservice import hash_pin, verify_admin_key
from app.services.image_decoder import decode_uploaded_image
from app.services.engines.deepface_engine import build_embedding
from app.services.crypto_service import encrypt_field
from app.schemas import (
    RegisterRequest, RegisterResponse,
    SeanceCreate, SeanceOut,
    AbsenceCreate, AbsenceOut,
    NoteCreate, NoteOut, FaceEmbedExtract
)


router = APIRouter(prefix="/admin", tags=["Administration"])

@router.post("/register", response_model=RegisterResponse, dependencies=[Depends(verify_admin_key)])
def admin_register_student(request: RegisterRequest, db: Session = Depends(get_db)):
    
    pin = request.pin  #utilisé pour chiffrement

    etudiant = Etudiant(
        nom=request.nom,
        prenom=request.prenom,
        email=encrypt_field(request.email, pin),
        filiere=request.filiere,
        date_naissance=request.date_naissance,
        sexe=request.sexe,
        telephone=encrypt_field(request.telephone, pin),
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
    return RegisterResponse(
        message="Etudiant enregistre avec succes",
        id_etudiant=etudiant.id_etudiant
    )


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

@router.post("/pic_to_embed", response_model=FaceEmbedExtract)
def extract_embed(file: UploadFile = File(...)):

    # Vérifier que c'est bien une image
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="The file must be an image")
    
    try:
        picture = file.file.read()
        if not picture:
            raise HTTPException(status_code=400, detail='Uploaded image is empty.')

        frame = decode_uploaded_image(picture)
        return {"face_embedding" : build_embedding(frame)}
    
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error: 
        raise HTTPException(status_code=500, detail=f'Authorization failed: {error}') from error
