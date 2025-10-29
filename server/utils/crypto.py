import base64
import os
from cryptography.fernet import Fernet, InvalidToken

# Creates or derives a Fernet key from an env var secret
# Set GITHUB_TOKEN_SECRET to a 32-byte base64 urlsafe key or any strong secret.

def _derive_key() -> bytes:
    secret = os.getenv("GITHUB_TOKEN_SECRET")
    if not secret:
        # Fallback to SECRET_KEY for convenience in dev; not recommended for prod
        secret = os.getenv("SECRET_KEY", "dev-secret-change-me")
    # If already a fernet key length (44 chars base64), use directly
    try:
        if len(secret) >= 44:
            base64.urlsafe_b64decode(secret)
            key = secret
        else:
            # Derive a fernet key from secret by padding/truncation
            key = base64.urlsafe_b64encode(secret.encode("utf-8").ljust(32, b"0")[:32])
    except Exception:
        key = base64.urlsafe_b64encode(secret.encode("utf-8").ljust(32, b"0")[:32])
    return key

def _fernet() -> Fernet:
    return Fernet(_derive_key())

def encrypt_text(plain: str) -> str:
    return _fernet().encrypt(plain.encode("utf-8")).decode("utf-8")

def decrypt_text(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        raise ValueError("Invalid encrypted token")
