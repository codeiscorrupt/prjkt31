import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

from app.core.rate_limit import limiter
from app.routes import (
    auth,
    etudiant,
    admin_db,
    authorize,
    detect,
    websocket_detect,
    gesture_pin,
)


app = FastAPI(
    title="Biometric Access API",
    description="API pour le systeme de controle d'acces biometrique",
    version="1.0.0",
)

# Rate limiter global SlowAPI
# Important : les limites sont appliquees uniquement sur les routes
# qui ont @limiter.limit(...), par exemple /auth/pin/verify.
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too Many Requests"},
    )


# Dossier uploads accessible publiquement
uploads_path = os.path.join(os.path.dirname(__file__), "..", "uploads")
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")


# CORS securise pour frontend local + Cloudflare Tunnel
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.trycloudflare\.com",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
    "Authorization",
    "Content-Type",
    "x-admin-key",
    "X-API-Key",
    "X-Pin",
    "X-Client-ID",
],
)


@app.get("/")
def root():
    return {"message": "Biometric API running"}


@app.get("/health")
def health_check():
    return {
        "ok": True,
        "service": "face-auth-backend",
        "message": "Backend is running.",
    }


app.include_router(auth.router)
app.include_router(etudiant.router)
app.include_router(admin_db.router)
app.include_router(detect.router)
app.include_router(authorize.router)
app.include_router(websocket_detect.router)
app.include_router(gesture_pin.router)