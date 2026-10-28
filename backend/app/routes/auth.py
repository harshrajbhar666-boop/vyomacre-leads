"""Admin login — single admin from env, returns a signed token."""

import hmac

from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.schemas import LoginRequest
from app.security import create_token

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.post("/login")
def login(payload: LoginRequest):
    email_ok = hmac.compare_digest(payload.email.strip().lower(), settings.ADMIN_EMAIL.strip().lower())
    pass_ok = hmac.compare_digest(payload.password, settings.ADMIN_PASSWORD)
    if not (email_ok and pass_ok):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect.")

    return {
        "status": "success",
        "code": 200,
        "message": "Logged in.",
        "data": {"token": create_token(settings.ADMIN_EMAIL), "email": settings.ADMIN_EMAIL},
    }
