import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings


def _get_key() -> bytes:
    """Return the raw 32-byte AES-256 key from settings."""
    return base64.b64decode(settings.MESSAGE_ENCRYPTION_KEY)


def encrypt_message(plaintext: str) -> str:
    """
    Encrypt plaintext with AES-256-GCM.
    Returns a base64 string: nonce (12 bytes) || ciphertext+tag.
    """
    key = _get_key()
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
    combined = nonce + ciphertext
    return base64.b64encode(combined).decode('utf-8')


def decrypt_message(encrypted: str) -> str:
    """
    Decrypt a base64 AES-256-GCM blob produced by encrypt_message.
    Returns the original plaintext string.
    """
    key = _get_key()
    combined = base64.b64decode(encrypted.encode('utf-8'))
    nonce = combined[:12]
    ciphertext = combined[12:]
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode('utf-8')
