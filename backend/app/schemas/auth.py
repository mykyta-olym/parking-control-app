# app/schemas/auth.py
from __future__ import annotations
from datetime import datetime
from typing import Literal, List, Union
from pydantic import BaseModel, Field, ConfigDict

class TokenOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int | None = None

class Claims(BaseModel):
    model_config = ConfigDict(extra="allow")

    sub: str
    iss: str | None = None
    aud: Union[str, List[str], None] = None
    exp: int | datetime | None = None
    scope: str | None = None
