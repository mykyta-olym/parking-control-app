# app/services/ingest_service.py
from __future__ import annotations
from datetime import datetime, timezone
from typing import Dict, Iterable

from sqlalchemy.orm import Session

from app.schemas.ingest import ZonesSnapshotIn, ZonesSnapshotOut, ZoneLoadIn
from app.models.zone import ParkingZone
from app.models.snapshot import ZoneSnapshot


def _to_utc(ts: datetime) -> datetime:
    """Normalize timestamps to UTC for consistent comparisons."""
    return ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts.astimezone(timezone.utc)


def _latest_per_zone(zones: Iterable[ZoneLoadIn]) -> Dict[str, ZoneLoadIn]:
    """Keep only the freshest record per zone within a single payload."""
    latest: Dict[str, ZoneLoadIn] = {}
    for item in zones:
        current = latest.get(item.zone_id)
        if current is None or _to_utc(item.ts) > _to_utc(current.ts):
            latest[item.zone_id] = item
    return latest


def apply_zone_snapshot(db: Session, payload: ZonesSnapshotIn) -> ZonesSnapshotOut:
    """
    Accepts aggregated occupancy per zone (no spot-level entities anymore).
    For each zone we store total/occupied counters and the timestamp of the snapshot.
    Older snapshots are ignored per zone.
    """
    total_received = len(payload.zones)

    if total_received == 0:
        return ZonesSnapshotOut(received=0, updated=0, ignored_outdated=0, missing_zones=0)

    latest_payload = _latest_per_zone(payload.zones)
    zone_ids = list(latest_payload.keys())
    existing: Dict[str, ParkingZone] = {
        z.id: z for z in db.query(ParkingZone).filter(ParkingZone.id.in_(zone_ids))
    }

    missing_zones = 0
    ignored_outdated = 0
    updated = 0

    new_snapshots: list[ZoneSnapshot] = []

    for zone_id, snapshot in latest_payload.items():
        zone = existing.get(zone_id)
        if zone is None:
            missing_zones += 1
            continue

        zone_ts_current = zone.last_update
        incoming_ts = _to_utc(snapshot.ts)

        if zone_ts_current is not None and incoming_ts <= _to_utc(zone_ts_current):
            ignored_outdated += 1
            continue

        total_override = snapshot.total_spots
        total = zone.total_spots if total_override is None else max(total_override, 0)
        occupied = max(snapshot.occupied_spots, 0)
        if occupied > total:
            occupied = total  # clamp instead of erroring; payload is already trusted at this layer

        if total_override is not None:
            zone.total_spots = total
        zone.occupied_spots = occupied
        zone.last_update = incoming_ts

        new_snapshots.append(
            ZoneSnapshot(
                zone_id=zone.id,
                district=zone.district,
                ts=incoming_ts,
                total_spots=zone.total_spots,
                occupied_spots=zone.occupied_spots,
                price_per_hour=zone.price_per_hour,
                is_open=zone.is_open,
            )
        )
        updated += 1

    if new_snapshots:
        db.add_all(new_snapshots)

    return ZonesSnapshotOut(
        received=total_received,
        updated=updated,
        ignored_outdated=ignored_outdated,
        missing_zones=missing_zones,
    )
