"""
Tiny admin auth: one admin (email + password from env) and an HMAC-signed token.
No extra libraries — hmac/base64/json from the standard library.
"""

import base64
import hashlib
import hmac
import json
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

_bearer = HTTPBearer(auto_error=False)


def _sign(payload_b64: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256
    ).hexdigest()


def create_token(email: str) -> str:
    payload = {"sub": email, "exp": int(time.time()) + settings.TOKEN_TTL_HOURS * 3600}
    b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    return f"{b64}.{_sign(b64)}"


def _verify(token: str) -> dict:
    try:
        b64, sig = token.split(".", 1)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token.")
    if not hmac.compare_digest(sig, _sign(b64)):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token.")
    try:
        payload = json.loads(base64.urlsafe_b64decode(b64.encode()))
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token.")
    if payload.get("exp", 0) < time.time():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired. Login again.")
    return payload


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing token.")
    payload = _verify(credentials.credentials)
    return payload.get("sub", "")
