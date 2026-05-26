import os
import logging

logger = logging.getLogger(__name__)

def _get_fernet():
    key = os.getenv("FIELD_ENCRYPTION_KEY", "").strip()
    env = os.getenv("ENVIRONMENT", "development")
    if not key:
        if env == "production":
            raise RuntimeError(
                "FIELD_ENCRYPTION_KEY environment variable is required in production. "
                "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"")
        logger.warning("FIELD_ENCRYPTION_KEY not set — guest PII will not be encrypted (dev mode only)")
        return None
    try:
        from cryptography.fernet import Fernet
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception as e:
        if env == "production":
            raise RuntimeError(f"Invalid FIELD_ENCRYPTION_KEY: {e}")
        logger.error(f"Invalid FIELD_ENCRYPTION_KEY: {e}")
        return None

def encrypt_field(value):
    """Encrypt a string field for storage. Returns plain text if key not set."""
    if value is None or value == "":
        return value
    f = _get_fernet()
    if not f:
        return value
    try:
        return f.encrypt(str(value).encode()).decode()
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return value

def decrypt_field(value):
    """Decrypt a stored field. Returns value as-is if key not set or decryption fails."""
    if value is None or value == "":
        return value
    f = _get_fernet()
    if not f:
        return value
    try:
        return f.decrypt(str(value).encode()).decode()
    except Exception:
        return value  # Handles unencrypted legacy data gracefully
