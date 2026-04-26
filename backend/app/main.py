from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes import auth, etudiant, admin_db, authorize, detect
import os


app = FastAPI(
    title="Biometric Access API",
    description="API pour le systeme de controle d'acces biometrique",
    version="1.0.0"
)

# Dossier uploads accessible publiquement
uploads_path = os.path.join(os.path.dirname(__file__), "..", "uploads")
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get("/")
def root():
    return {"message": "Biometric API running"}

@app.get('/health')
def health_check():
    return {
        'ok': True,
        'service': 'face-auth-backend',
        'message': 'Backend is running.',
    }

app.include_router(auth.router)
app.include_router(etudiant.router)
app.include_router(admin_db.router)
app.include_router(detect.router)
app.include_router(authorize.router)
