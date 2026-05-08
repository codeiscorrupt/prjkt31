from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str # for jwt token signing
    ALGORITHM: str = "HS256" #for JWT tokens
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10
    FACE_METRIC: str = "l2"          # Options: "cosine", "l2", "ip"
    FACE_THRESHOLD: float = 10        # Distance threshold (0.15 distance ≈ 0.85 similarity)
    VECTOR_DIMENSION: int = 128
    ENCRYPTION: str = "argon2"
    ADMIN_API_KEYS: str


    CACHE_MAX: int = 4
    CACH_REQUIRED: int = 2
    UNKNOWN_FACE_CACHE_MAX: int = 8
    UNKNOWN_FACE_CACHE_REQ: int = 4
    UNKNOWN_FACE_THRESHOLD: int = FACE_THRESHOLD
    UNKNOWN_FACE_METRIC: str = FACE_METRIC
    UNKNOWN_FACE_TTL: int = 10

    class Config:
        env_file = ".env"

settings = Settings()
