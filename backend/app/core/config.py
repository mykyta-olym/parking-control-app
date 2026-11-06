# app/core/config.py
# Robust settings for small project; no fragile Union, tolerant CORS parsing.

from __future__ import annotations

import json
import os
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # SQLite by default; override in .env if needed
    DB_URL: str = os.getenv("DB_URL")

    # Admin security
    APP_JWT_SECRET: str | None = None
    APP_JWT_ALG: str = "HS256"
    APP_JWT_ISS: str | None = None
    APP_JWT_AUD: str | None = None
    APP_TOKEN_TTL_SECONDS: int | None = None
    ADMIN_API_KEYS: list[str] = Field(default_factory=list)

    # Accepts: JSON list, comma-separated string, "*", or empty → becomes ["*"]
    CORS_ORIGINS: list[str] | str | None = None

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: Any) -> list[str]:
        # Empty / None → allow all (dev)
        if v is None or (isinstance(v, str) and not v.strip()):
            return ["*"]

        # Already a list
        if isinstance(v, list):
            return [str(x).strip() for x in v]

        # String input
        if isinstance(v, str):
            s = v.strip()
            if s == "*":
                return ["*"]
            # JSON list in string
            if s.startswith("["):
                try:
                    data = json.loads(s)
                    if isinstance(data, list):
                        return [str(x).strip() for x in data]
                except Exception:
                    # fall through to comma parsing
                    pass
            # Comma-separated string -> list
            return [p.strip() for p in s.split(",") if p.strip()]

        # Fallback
        return ["*"]

    @field_validator("ADMIN_API_KEYS", mode="before")
    @classmethod
    def parse_api_keys(cls, v: Any) -> list[str]:
        if v is None:
            return []
        if isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        if isinstance(v, str):
            raw = v.strip()
            if not raw:
                return []
            if raw.startswith("["):
                try:
                    data = json.loads(raw)
                    if isinstance(data, list):
                        return [str(item).strip() for item in data if str(item).strip()]
                except Exception:
                    pass
            return [part.strip() for part in raw.split(",") if part.strip()]
        return []

    @field_validator("APP_JWT_ISS", "APP_JWT_AUD", mode="before")
    @classmethod
    def strip_strings(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip() or None
        return v


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
