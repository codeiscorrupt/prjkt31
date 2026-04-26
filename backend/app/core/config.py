from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str # for jwt token signing
    ALGORITHM: str = "HS256" #for JWT tokens
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    FACE_METRIC: str = "l2"          # Options: "cosine", "l2", "ip"
    FACE_THRESHOLD: float = 10        # Distance threshold (0.15 distance ≈ 0.85 similarity)
    VECTOR_DIMENSION: int = 128
    ENCRYPTION: str = "argon2"
    ADMIN_API_KEYS: str

    class Config:
        env_file = ".env"

settings = Settings()
