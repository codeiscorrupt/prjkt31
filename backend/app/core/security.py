import secrets
from fastapi import Header, HTTPException
from app.core.config import settings


def get_bearer_token(
    authorization: str = Header(None, alias="Authorization")
) -> str:
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header"
        )

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization header"
        )

    return token


def verify_admin_key(
    x_admin_key: str = Header(None, alias="x-admin-key")
):
    valid_keys = [
        key.strip()
        for key in settings.ADMIN_API_KEYS.split(",")
        if key.strip()
    ]

    if not x_admin_key:
        raise HTTPException(
            status_code=403,
            detail="Missing admin key"
        )

    is_valid = any(
        secrets.compare_digest(x_admin_key, key)
        for key in valid_keys
    )

    if not is_valid:
        raise HTTPException(
            status_code=403,
            detail="Invalid admin key"
        )

    return True