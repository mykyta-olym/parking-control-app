from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers.admin import router as admin_router
from app.routers.parking import router as parking_router


settings = get_settings()

app = FastAPI(title="Parking Control API")

cors_origins = list(settings.CORS_ORIGINS or ["*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(admin_router)
app.include_router(parking_router)
