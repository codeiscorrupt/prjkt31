from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes import pin_auth, etudiant, admin_db, authorize, detect, websocket_detect, gesture_pin
import os
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter


app = FastAPI(
    title="Biometric Access API",
    description="API pour le systeme de controle d'acces biometrique",
    version="1.0.0"
)


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

app.include_router(pin_auth.router)
app.include_router(etudiant.router)
app.include_router(admin_db.router)
app.include_router(detect.router)
app.include_router(authorize.router)
app.include_router(websocket_detect.router)
app.include_router(gesture_pin.router)
