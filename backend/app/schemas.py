from pydantic import BaseModel, field_validator
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

class EtudiantCreate(EtudiantBase):
    pass

class EtudiantOut(EtudiantBase):
    id_etudiant: int
    class Config:
        from_attributes = True

# ─── Auth ───────────────────────────────────────────────
class AuthOut(BaseModel):
    id_auth: int
    role: Optional[str]
    class Config:
        from_attributes = True

# ─── Face ID + PIN ──────────────────────────────────────
class FaceAuthRequest(BaseModel):
    face_embedding: list[float]

class FaceAuthResponse(BaseModel):
    access_token: str
    token_type: str
    etudiant: EtudiantOut

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

# ─── Biometrie ──────────────────────────────────────────
class BiometrieCreate(BaseModel):
    id_etudiant: int
    face_embedding: list[float]

class BiometrieOut(BiometrieCreate):
    id_bio: int
    class Config:
        from_attributes = True

# ─── Identite ───────────────────────────────────────────
class IdentiteCreate(BaseModel):
    id_etudiant: int
    cne: Optional[str] = None
    cin: Optional[str] = None

class IdentiteOut(IdentiteCreate):
    id_identite: int
    class Config:
        from_attributes = True

# ─── Seance ─────────────────────────────────────────────
class SeanceCreate(BaseModel):
    filiere: Optional[str] = None
    module: Optional[str] = None
    salle: Optional[str] = None
    date_seance: Optional[date] = None
    heure_debut: Optional[time] = None
    heure_fin: Optional[time] = None

class SeanceOut(SeanceCreate):
    id_seance: int
    class Config:
        from_attributes = True

# ─── Absence ────────────────────────────────────────────
class AbsenceCreate(BaseModel):
    id_etudiant: int
    id_seance: int
    justifie: Optional[bool] = False

class AbsenceOut(AbsenceCreate):
    id_absence: int
    class Config:
        from_attributes = True

# ─── Note ───────────────────────────────────────────────
class NoteCreate(BaseModel):
    id_etudiant: int
    module: Optional[str] = None
    note: Optional[Decimal] = None
    session: Optional[str] = None
    annee: Optional[str] = None

class NoteOut(NoteCreate):
    id_note: int
    class Config:
        from_attributes = True
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

