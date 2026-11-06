# app/repos/zone_repo.py
from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, TypedDict, Optional, Sequence
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.zone import ParkingZone

class ZoneCountersRow(TypedDict):
    zone_id: str
    free: int
    occupied: int
    total: int
    newest_ts: Optional[datetime]

def list_zones(db: Session) -> list[ParkingZone]:
    return list(db.scalars(select(ParkingZone)))

def get_zone_counters(db: Session, zone_ids: Optional[Sequence[str]] = None) -> list[ZoneCountersRow]:
    """
    Aggregates counters stored on the ParkingZone itself (spot-level entities were removed).
    Returns: zone_id, free, occupied, total, newest_ts.
    """
    stmt = select(
        ParkingZone.id,
        ParkingZone.total_spots,
        ParkingZone.occupied_spots,
        ParkingZone.last_update,
    )
    if zone_ids:
        stmt = stmt.filter(ParkingZone.id.in_(zone_ids))

    rows: list[ZoneCountersRow] = []
    for z_id, total, occ, newest_ts in db.execute(stmt):
        total = int(total or 0)
        occ = int(occ or 0)
        free = max(total - occ, 0)
        rows.append({
            "zone_id": z_id,
            "free": free,
            "occupied": occ,
            "total": total,
            "newest_ts": newest_ts,
        })
    return rows

def get_zones_with_counters(db: Session, zone_ids: Optional[Sequence[str]] = None) -> list[Dict[str, Any]]:
    """
    Returns zones along with their aggregates: {id, name, type, district, polygon, counters{...}, newest_ts}.
    Convenient for assembling a service response (only type conversion remains to be done).
    """
    zone_stmt = select(ParkingZone)
    if zone_ids:
        zone_stmt = zone_stmt.filter(ParkingZone.id.in_(zone_ids))
    zones = {z.id: z for z in db.scalars(zone_stmt)}

    counters = {c["zone_id"]: c for c in get_zone_counters(db, zone_ids=zone_ids)}

    result: list[Dict[str, Any]] = []
    for zid, z in zones.items():
        c = counters.get(zid, {"free": 0, "occupied": 0, "total": 0, "newest_ts": None})
        result.append({
            "id": z.id,
            "name": z.name,
            "type": z.type,
            "district": z.district,
            "polygon": z.polygon,
            "address": z.address,
            "description": z.description,
            "lat": z.lat,
            "lon": z.lon,
            "price_label": z.price_label,
            "price_per_hour": z.price_per_hour,
            "opening_hours": z.opening_hours,
            "is_open": z.is_open,
            "features": z.features or [],
            "counters": {
                "free": c["free"],
                "occupied": c["occupied"],
                "total": c["total"],
            },
            "newest_ts": c["newest_ts"],
        })
    return result
