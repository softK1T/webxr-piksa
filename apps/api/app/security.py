import base64
import hashlib
import hmac
import os
import secrets
import time

SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**14, 8, 1
TOKEN_TTL_SECONDS = 7 * 24 * 3600


def _secret() -> bytes:
    return os.environ.get("SECRET_KEY", "dev-insecure-secret-change-me").encode()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P
    )
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, salt_hex, digest_hex = stored.split("$")
    except ValueError:
        return False
    if scheme != "scrypt":
        return False
    digest = hashlib.scrypt(
        password.encode(),
        salt=bytes.fromhex(salt_hex),
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
    )
    return hmac.compare_digest(digest.hex(), digest_hex)


def _sign(payload: str) -> str:
    return hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()


def create_token(user_id: int, now: float | None = None) -> str:
    expires = int((now or time.time()) + TOKEN_TTL_SECONDS)
    payload = base64.urlsafe_b64encode(f"{user_id}:{expires}".encode()).decode()
    return f"{payload}.{_sign(payload)}"


def read_token(token: str, now: float | None = None) -> int | None:
    try:
        payload, signature = token.split(".")
        if not hmac.compare_digest(signature, _sign(payload)):
            return None
        user_id, expires = base64.urlsafe_b64decode(payload).decode().split(":")
        if int(expires) < (now or time.time()):
            return None
        return int(user_id)
    except (ValueError, UnicodeDecodeError):
        return None
