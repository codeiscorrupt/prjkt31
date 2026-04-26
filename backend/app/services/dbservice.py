import secrets

from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from app.core.config import settings
from fastapi import HTTPException, Header

password_hash_algo = settings.ENCRYPTION
pwd_context = CryptContext(schemes=[password_hash_algo], deprecated="auto")

def hash_pin(pin: str) -> str:
    return pwd_context.hash(pin)

def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    return pwd_context.verify(plain_pin, hashed_pin)

def create_token(data: dict, expires_minutes: int = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
    
def get_token_data(token: str):
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")



# Load from .env: ADMIN_API_KEYS=sk_abc123,sk_def456
def get_admin_keys() -> list[str]:
    return [k.strip() for k in settings.ADMIN_API_KEYS.split(",") if k.strip()]

async def verify_admin_key(x_api_key: str = Header(None, alias="X-API-Key")):
    if not x_api_key:
        raise HTTPException(401, "Missing X-API-Key header")
    
    # Constant-time comparison prevents timing attacks
    valid_keys = get_admin_keys()
    if not any(secrets.compare_digest(x_api_key, key) for key in valid_keys):
        raise HTTPException(401, "Invalid admin API key")
    
    return {"role": "admin", "source": "api_key"}
