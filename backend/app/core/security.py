from __future__ import annotations

from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from jwt import ExpiredSignatureError, InvalidTokenError

from app.core.config import get_settings
from app.schemas.auth import Claims

bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def _validate_jwt(token: str) -> Claims:
    settings = get_settings()

    if not settings.APP_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="JWT authentication is not configured.",
        )

    decode_kwargs: dict[str, object] = {
        "algorithms": [settings.APP_JWT_ALG],
        "options": {"verify_aud": bool(settings.APP_JWT_AUD)},
    }
    if settings.APP_JWT_AUD:
        decode_kwargs["audience"] = settings.APP_JWT_AUD
    if settings.APP_JWT_ISS:
        decode_kwargs["issuer"] = settings.APP_JWT_ISS

    try:
        payload = jwt.decode(token, settings.APP_JWT_SECRET, **decode_kwargs)
    except ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired.",
        ) from exc
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        ) from exc

    return Claims.model_validate(payload)


def require_admin(
    bearer: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    api_key: Optional[str] = Depends(api_key_header),
) -> Claims:
    """
    Ensures that the caller is authenticated either via API key or JWT.
    Preference order: API key (if configured) → JWT bearer token.
    """
    settings = get_settings()

    # Prefer API keys when provided
    if api_key:
        allowed_keys = set(settings.ADMIN_API_KEYS or [])
        if api_key in allowed_keys:
            return Claims.model_validate({"sub": f"api-key:{api_key}", "scope": "admin"})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key.",
        )

    if bearer and bearer.credentials:
        return _validate_jwt(bearer.credentials)

    # If neither mechanism is configured, report unauthorized to avoid leaking config state.
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated.",
    )
