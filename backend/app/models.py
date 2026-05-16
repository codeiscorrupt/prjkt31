from sqlalchemy import Column, Integer, String, Date, Time, Numeric, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.db.database import Base
from app.core.config import settings

VECTOR_DIMENSION = settings.VECTOR_DIMENSION

class Etudiant(Base):
    __tablename__ = "etudiant"
    id_etudiant = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=False)
    date_naissance = Column(Date)
    sexe = Column(String(1))
    email = Column(Text)
    telephone = Column(Text)
    adresse = Column(Text)
    filiere = Column(String(100))
    auth = relationship("Auth", back_populates="etudiant")
    biometrie = relationship("Biometrie", back_populates="etudiant")
    absences = relationship("Absence", back_populates="etudiant")
    notes = relationship("Note", back_populates="etudiant")
    identite = relationship("Identite", back_populates="etudiant")

class Auth(Base):
    __tablename__ = "auth"
    id_auth = Column(Integer, primary_key=True, index=True)
    id_etudiant = Column(Integer, ForeignKey("etudiant.id_etudiant"))
    role = Column(String(50))
    pin_hash = Column(String(255), nullable=False)
    etudiant = relationship("Etudiant", back_populates="auth")

class Biometrie(Base):
    __tablename__ = "biometrie"
    id_bio = Column(Integer, primary_key=True, index=True)
    id_etudiant = Column(Integer, ForeignKey("etudiant.id_etudiant"))
    face_embedding = Column(Vector(VECTOR_DIMENSION))
    etudiant = relationship("Etudiant", back_populates="biometrie")

class Identite(Base):
    __tablename__ = "identite"
    id_identite = Column(Integer, primary_key=True, index=True)
    id_etudiant = Column(Integer, ForeignKey("etudiant.id_etudiant"))
    cne = Column(Text)
    cin = Column(Text)
    etudiant = relationship("Etudiant", back_populates="identite")

class Seance(Base):
    __tablename__ = "seance"
    id_seance = Column(Integer, primary_key=True, index=True)
    filiere = Column(String(100))
    module = Column(String(100))
    salle = Column(String(50))
    date_seance = Column(Date)
    heure_debut = Column(Time)
    heure_fin = Column(Time)
    absences = relationship("Absence", back_populates="seance")

class Absence(Base):
    __tablename__ = "absences"
    id_absence = Column(Integer, primary_key=True, index=True)
    id_etudiant = Column(Integer, ForeignKey("etudiant.id_etudiant"))
    id_seance = Column(Integer, ForeignKey("seance.id_seance"))
    justifie = Column(Boolean, default=False)
    etudiant = relationship("Etudiant", back_populates="absences")
    seance = relationship("Seance", back_populates="absences")

class Note(Base):
    __tablename__ = "notes"
    id_note = Column(Integer, primary_key=True, index=True)
    id_etudiant = Column(Integer, ForeignKey("etudiant.id_etudiant"))
    module = Column(String(100))
    note = Column(Numeric(5, 2))
    session = Column(String(50))
    annee = Column(String(9))
    etudiant = relationship("Etudiant", back_populates="notes")
