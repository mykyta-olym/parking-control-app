# app/schemas/ingest.py
from __future__ import annotations
from typing import List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ZoneLoadIn(BaseModel):
    """
    Snapshot for a single zone.
    The frontend knows how many spots the zone has and tells us how many are currently occupied.
    """

    model_config = ConfigDict(extra="forbid")

    zone_id: str
    total_spots: int | None = Field(default=None, ge=0)
    occupied_spots: int = Field(ge=0)
    ts: datetime


class ZonesSnapshotIn(BaseModel):
    """Batch of zone occupancy snapshots."""

    model_config = ConfigDict(extra="forbid")
    zones: List[ZoneLoadIn]


class ZonesSnapshotOut(BaseModel):
    """Ingestion summary returned to the client."""

    received: int = Field(ge=0)
    updated: int = Field(ge=0)
    ignored_outdated: int = Field(ge=0)
    missing_zones: int = Field(ge=0)

# Backwards compatibility with the previous spot-level ingestion API.
EventsSnapshotIn = ZonesSnapshotIn
EventsSnapshotOut = ZonesSnapshotOut
SpotEventIn = ZoneLoadIn
