# app/repos/spot_repo.py
from __future__ import annotations
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.spot import ParkingSpot

def list_spots(db: Session) -> list[ParkingSpot]:
    return list(db.scalars(select(ParkingSpot)))

def list_spots_by_zone(db: Session, zone_id: str) -> list[ParkingSpot]:
    stmt = select(ParkingSpot).where(ParkingSpot.zone_id == zone_id)
    return list(db.scalars(stmt))
