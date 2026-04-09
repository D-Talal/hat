import os
import base64
from cryptography.fernet import Fernet

def _get_fernet() -> Fernet:
    key = os.getenv("FIELD_ENCRYPTION_KEY")
    if not key:
        # Auto-generate in dev — in production this MUST be set
        key = base64.urlsafe_b64encode(os.urandom(32)).decode()
        os.environ["FIELD_ENCRYPTION_KEY"] = key
    # Ensure key is valid Fernet format (32 url-safe base64 bytes)
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        # If key isn't valid Fernet format, derive one from it
        import hashlib
        derived = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())
        return Fernet(derived)

def encrypt_field(value: str | None) -> str | None:
    """Encrypt a string field for storage."""
    if value is None or value == "":
        return value
    f = _get_fernet()
    return f.encrypt(value.encode()).decode()

def decrypt_field(value: str | None) -> str | None:
    """Decrypt a stored field for display."""
    if value is None or value == "":
        return value
    try:
        f = _get_fernet()
        return f.decrypt(value.encode()).decode()
    except Exception:
        # Return as-is if decryption fails (unencrypted legacy data)
        return value

def encrypt_if_set(value: str | None) -> str | None:
    """Only encrypt if value is non-empty."""
    if not value:
        return value
    return encrypt_field(value)
