# backend/app/services/crypto_service.py
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64, os

def _derive_key(pin: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # AES-256
        salt=salt,
        iterations=100_000,  # OWASP 2024
        backend=default_backend()
    )
    return kdf.derive(pin.encode())

def encrypt_field(plaintext: str, pin: str) -> str:
    salt = os.urandom(16)
    nonce = os.urandom(12)
    key = _derive_key(pin, salt)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return f"{base64.b64encode(salt).decode()}.{base64.b64encode(nonce).decode()}.{base64.b64encode(ciphertext).decode()}"

def decrypt_field(payload: str, pin: str) -> str:
    try:
        salt_b64, nonce_b64, ciphertext_b64 = payload.split(".")
        salt = base64.b64decode(salt_b64)
        nonce = base64.b64decode(nonce_b64)
        ciphertext = base64.b64decode(ciphertext_b64)
        key = _derive_key(pin, salt)
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, None).decode()
    except Exception as e:
        raise ValueError("Invalid PIN or corrupted data") from e