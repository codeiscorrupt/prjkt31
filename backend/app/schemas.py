from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import date, time
from decimal import Decimal
from app.core.config import settings

# ─── Etudiant ───────────────────────────────────────────
class EtudiantBase(BaseModel):
    nom: str
    prenom: str
    date_naissance: Optional[date] = None
    sexe: Optional[str] = None
    email: Optional[str] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    filiere: Optional[str] = None
    photo_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class EtudiantOut(EtudiantBase):
    id_etudiant: int
    model_config = ConfigDict(from_attributes=True)

class AuthOut(BaseModel):
    id_auth: int
    role: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class FaceAuthRequest(BaseModel):
    face_embedding: list[float]

class FaceEmbedExtract(BaseModel):
    face_embedding: Optional[list[float]] = None

class FaceAuthResponse(BaseModel):
    access_token: str
    token_type: str
    etudiant: EtudiantOut
    model_config = ConfigDict(from_attributes=True)

class FacePendingResponse(BaseModel):
    status: str
    progress: int
    matches_needed: int
    message: str

class PinVerifyRequest(BaseModel):
    id_etudiant: int
    pin: str

class PinVerifyResponse(BaseModel):
    access_token_sensible: str
    token_type: str
    model_config = ConfigDict(from_attributes=True)

class BiometrieCreate(BaseModel):
    id_etudiant: int
    face_embedding: list[float]

class BiometrieOut(BiometrieCreate):
    id_bio: int
    model_config = ConfigDict(from_attributes=True)

class IdentiteCreate(BaseModel):
    id_etudiant: int
    cne: Optional[str] = None
    cin: Optional[str] = None

class IdentiteOut(IdentiteCreate):
    id_identite: int
    model_config = ConfigDict(from_attributes=True)

class SeanceCreate(BaseModel):
    filiere: Optional[str] = None
    module: Optional[str] = None
    salle: Optional[str] = None
    date_seance: Optional[date] = None
    heure_debut: Optional[time] = None
    heure_fin: Optional[time] = None

class SeanceOut(SeanceCreate):
    id_seance: int
    model_config = ConfigDict(from_attributes=True)

class AbsenceCreate(BaseModel):
    id_etudiant: int
    id_seance: int
    justifie: Optional[bool] = False

class AbsenceOut(AbsenceCreate):
    id_absence: int
    model_config = ConfigDict(from_attributes=True)

class NoteCreate(BaseModel):
    id_etudiant: int
    module: Optional[str] = None
    note: Optional[Decimal] = None
    session: Optional[str] = None
    annee: Optional[str] = None

class NoteOut(NoteCreate):
    id_note: int
    model_config = ConfigDict(from_attributes=True)

# ─── Register ───────────────────────────────────────────
class RegisterRequest(BaseModel):
    nom: str
    prenom: str
    email: str
    filiere: str
    date_naissance: Optional[date] = None
    sexe: Optional[str] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    pin: str
    face_embedding: list[float]
    cne: Optional[str] = None
    cin: Optional[str] = None
    notes: Optional[list] = None

    @field_validator("face_embedding")
    @classmethod
    def validate_dimensions(cls, v: list[float]) -> list[float]:
        if len(v) != settings.VECTOR_DIMENSION:  # 🔹 Match your model's output dimension
            raise ValueError(f"Expected {settings.VECTOR_DIMENSION} dimensions, got {len(v)}")
        return v

class RegisterResponse(BaseModel):
    message: str
    id_etudiant: int
    model_config = ConfigDict(from_attributes=True)
