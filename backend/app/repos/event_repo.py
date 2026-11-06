# app/repos/event_repo.py
from __future__ import annotations
from typing import Iterable, Sequence, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
from app.models.event import SpotEvent

def append_events(db: Session, rows: Iterable[SpotEvent]) -> int:
    """
    Idempotent event insertion.
    Uses merge by primary key (id) so duplicates don’t fail (they get updated or skipped).
    Returns the number of processed records.
    """
    count = 0
    for row in rows:
        db.merge(row)  # SELECT + INSERT/UPDATE
        count += 1
    return count

def get_last_events_per_spot(
    db: Session,
    spot_ids: Optional[Sequence[str]] = None,
) -> list[SpotEvent]:
    """
    Returns ONE (latest by ts) event per spot.
    If spot_ids are provided, limits the selection to those specific spots.
    """
    subq = (
        select(SpotEvent.spot_id, func.max(SpotEvent.ts).label("max_ts"))
        .group_by(SpotEvent.spot_id)
        .subquery()
    )
    stmt = (
        select(SpotEvent)
        .join(subq, and_(SpotEvent.spot_id == subq.c.spot_id,
                         SpotEvent.ts == subq.c.max_ts))
    )
    if spot_ids:
        stmt = stmt.filter(SpotEvent.spot_id.in_(spot_ids))
    return list(db.scalars(stmt))
