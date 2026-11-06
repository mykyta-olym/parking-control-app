# app/services/parking_service.py
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from sqlalchemy.orm import Session
from app.repos.zone_repo import get_zones_with_counters
from app.schemas.parking import (
    ParkingListOut,
    ZoneOut,
    ZoneCountersOut,
    ParkingFacilitiesListOut,
    ParkingFacilityOut,
    DistrictMetaOut,
    CoordinatesOut,
)

def _parse_dt_opt(value: Optional[Union[str, datetime]]) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)

def get_parking_snapshot(db: Session) -> ParkingListOut:
    """
    Builds a parking snapshot: a list of zones with aggregates free/occupied/total
    and the newest_ts label (timestamp of the latest zone snapshot).
    Returns a Pydantic DTO ready to be returned from the API.
    """
    raw: List[Dict[str, Any]] = get_zones_with_counters(db)

    zones_out: List[ZoneOut] = []
    for z in raw:
        counters = ZoneCountersOut(
            free=z["counters"]["free"],
            occupied=z["counters"]["occupied"],
            total=z["counters"]["total"],
        )
        zones_out.append(
            ZoneOut(
                id=z["id"],
                name=z["name"],
                type=z["type"],
                district=z["district"],
                polygon=z["polygon"],
                counters=counters,
                newest_ts=_parse_dt_opt(z.get("newest_ts")),
            )
        )

    return ParkingListOut(
        server_ts=datetime.now(timezone.utc),
        zones=zones_out,
    )


DISTRICT_META = {
    "ZAPAD": {"label": "Západ", "color": "#F39C12"},
    "SEVER": {"label": "Sever", "color": "#6C5CE7"},
    "STARE MESTO": {"label": "Staré Mesto", "color": "#0984E3"},
    "JUH": {"label": "Juh", "color": "#00B894"},
}


def _district_meta(code: str) -> DistrictMetaOut:
    meta = DISTRICT_META.get(code, {"label": code.title(), "color": "#6B7280"})
    return DistrictMetaOut(code=code, label=meta["label"], color=meta["color"])


def _build_price_label(price_label: Optional[str], price_per_hour: Optional[float]) -> tuple[Optional[str], Optional[float]]:
    if price_label:
        return price_label, price_per_hour
    if price_per_hour is not None:
        return f"{price_per_hour:.2f}€/hod", price_per_hour
    return None, None


def _build_coordinates(lat: Optional[float], lon: Optional[float]) -> Optional[CoordinatesOut]:
    if lat is None or lon is None:
        return None
    return CoordinatesOut(latitude=lat, longitude=lon)


def _to_parking_facility(row: Dict[str, Any]) -> ParkingFacilityOut:
    counters = row["counters"]
    price, price_per_hour = _build_price_label(row.get("price_label"), row.get("price_per_hour"))

    return ParkingFacilityOut(
        id=row["id"],
        name=row["name"],
        district=_district_meta(str(row["district"])),
        address=row.get("address"),
        description=row.get("description"),
        coordinates=_build_coordinates(row.get("lat"), row.get("lon")),
        polygon=row.get("polygon"),
        features=list(row.get("features") or []),
        opening_hours=row.get("opening_hours"),
        is_open=bool(row.get("is_open", True)),
        total_spots=int(counters["total"]),
        free_spots=int(counters["free"]),
        price=price,
        price_per_hour=price_per_hour,
        last_update=row.get("newest_ts"),
    )


def list_parking_facilities(
    db: Session,
    *,
    district: Optional[str] = None,
    only_free: bool = False,
    max_price: Optional[float] = None,
    query: Optional[str] = None,
) -> ParkingFacilitiesListOut:
    raw: List[Dict[str, Any]] = get_zones_with_counters(db)
    district_filter = district.strip().upper() if district else None
    query_filter = query.strip().lower() if query else ""

    items: List[ParkingFacilityOut] = []
    for row in raw:
        facility = _to_parking_facility(row)

        if district_filter and facility.district.code != district_filter:
            continue
        if only_free and facility.free_spots <= 0:
            continue
        if max_price is not None:
            price_value: Optional[float] = facility.price_per_hour
            if price_value is None and facility.price:
                if facility.price.lower().startswith("zdarma"):
                    price_value = 0.0
            if price_value is None or price_value > max_price:
                continue
        if query_filter:
            haystack = " ".join(filter(None, [facility.name, facility.address or ""])).lower()
            if query_filter not in haystack:
                continue

        items.append(facility)

    return ParkingFacilitiesListOut(
        server_ts=datetime.now(timezone.utc),
        items=items,
    )


def get_parking_facility(db: Session, zone_id: str) -> Optional[ParkingFacilityOut]:
    rows = get_zones_with_counters(db, zone_ids=[zone_id])
    if not rows:
        return None
    return _to_parking_facility(rows[0])
