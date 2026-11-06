from __future__ import annotations

import argparse
import uuid
from datetime import datetime, timezone
from typing import Iterable, List

from sqlalchemy.orm import Session

from app.db.session import session_scope
from app.models import Base
from app.models.event import SpotEvent
from app.models.spot import ParkingSpot
from app.models.zone import ParkingZone
from app.models.snapshot import ZoneSnapshot
from app.models.types import SpotType, SpotStatus, ZoneType, District


def upsert_zone(
    db: Session,
    *,
    zone_id: str,
    name: str,
    zone_type: ZoneType,
    district: District,
    polygon: dict,
    address: str | None = None,
    description: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    price_label: str | None = None,
    price_per_hour: float | None = None,
    opening_hours: str | None = None,
    is_open: bool = True,
    features: List[str] | None = None,
    total_spots: int = 0,
    occupied_spots: int = 0,
    last_update: datetime | None = None,
) -> None:
    zone = db.get(ParkingZone, zone_id)
    if zone is None:
        zone = ParkingZone(
            id=zone_id,
            name=name,
            type=zone_type,
            district=district,
            polygon=polygon,
            address=address,
            description=description,
            lat=lat,
            lon=lon,
            price_label=price_label,
            price_per_hour=price_per_hour,
            opening_hours=opening_hours,
            is_open=is_open,
            features=features or [],
            total_spots=total_spots,
            occupied_spots=occupied_spots,
            last_update=last_update,
        )
        db.add(zone)
    else:
        zone.name = name
        zone.type = zone_type
        zone.district = district
        zone.polygon = polygon
        zone.address = address
        zone.description = description
        zone.lat = lat
        zone.lon = lon
        zone.price_label = price_label
        zone.price_per_hour = price_per_hour
        zone.opening_hours = opening_hours
        zone.is_open = is_open
        zone.features = features or []
        zone.total_spots = total_spots
        zone.occupied_spots = occupied_spots
        zone.last_update = last_update or zone.last_update


def upsert_spot(db: Session, *, spot_id: str, zone_id: str, lat: float, lon: float, spot_type: SpotType) -> None:
    spot = db.get(ParkingSpot, spot_id)
    if spot is None:
        spot = ParkingSpot(id=spot_id, zone_id=zone_id, lat=lat, lon=lon, type=spot_type)
        db.add(spot)
    else:
        spot.zone_id = zone_id
        spot.lat = lat
        spot.lon = lon
        spot.type = spot_type


def upsert_events(db: Session, rows: Iterable[SpotEvent]) -> None:
    for row in rows:
        db.merge(row)


def seed_demo(db: Session, *, reset: bool = False) -> None:
    Base.metadata.create_all(bind=db.get_bind())

    if reset:
        db.query(SpotEvent).delete()
        db.query(ParkingSpot).delete()
        db.query(ParkingZone).delete()
        db.query(ZoneSnapshot).delete()
        db.flush()

    base_ts = datetime.now(timezone.utc)

    upsert_zone(
        db,
        zone_id="L9B-parking",
        name="L9B parking",
        zone_type=ZoneType.private,
        district=District.sever,
        address="Letná 9, 042 00 Košice",
        description="Parkovisko pri Letnej 9 (L9B).",
        lat=48.73128867193887,
        lon=21.245007725625673,
        price_label="0€/hod",
        price_per_hour=0,
        opening_hours="Po-Ne 08:00-22:00",
        is_open=True,
        features=["Kamerový systém", "Osvetlené", "24/7"],
        total_spots=22,
        occupied_spots=0,
        last_update=base_ts,
        polygon={
            "type": "Polygon",
            "coordinates": [
                [
                    [21.24475, 48.7311],
                    [21.24525, 48.7311],
                    [21.24525, 48.73145],
                    [21.24475, 48.73145],
                    [21.24475, 48.7311],
                ]
            ],
        },
    )
    upsert_zone(
        db,
        zone_id="BN32-parking",
        name="BN32 parking",
        zone_type=ZoneType.street,
        district=District.sever,
        address="Boženy Němcovej 32, 040 01 Košice",
        description="parkovisko pri Boženy Němcovej 32.",
        lat=48.730090895288605,
        lon=21.244605897739586,
        price_label="0€/hod",
        price_per_hour=0,
        opening_hours="24/7",
        is_open=True,
        features=["Kamerový systém", "Osvetlené", "EV nabíjanie"],
        total_spots=10,
        occupied_spots=0,
        last_update=base_ts,
        polygon={
            "type": "Polygon",
            "coordinates": [
                [
                    [21.24435, 48.7299],
                    [21.2449, 48.7299],
                    [21.2449, 48.7303],
                    [21.24435, 48.7303],
                    [21.24435, 48.7299],
                ]
            ],
        },
    )
    upsert_zone(
        db,
        zone_id="Komenskho19-parking",
        name="Komenského park 19",
        zone_type=ZoneType.private,
        district=District.sever,
        address="Komenského park 19, 040 01 Košice",
        description="Parkovisko pri FBERG ( Fakulta baníctva, ekológie, riadenia a geotechnológií).",
        lat=48.733172,
        lon=21.243605,
        price_label="0€/hod",
        price_per_hour=0,
        opening_hours="Po-Ne 08:00-22:00",
        is_open=True,
        features=["Kamerový systém", "Osvetlené"],
        total_spots=35,
        occupied_spots=0,
        last_update=base_ts,
        polygon={
            "type": "Polygon",
            "coordinates": [
                [
                    [21.24335, 48.73305],
                    [21.24385, 48.73305],
                    [21.24385, 48.73335],
                    [21.24335, 48.73335],
                    [21.24335, 48.73305],
                ]
            ],
        },
    )

    # Create initial snapshots for seeded zones so analytics has baseline history
    zones = db.query(ParkingZone).all()
    for z in zones:
        db.add(
            ZoneSnapshot(
                zone_id=z.id,
                district=z.district,
                ts=base_ts,
                total_spots=z.total_spots,
                occupied_spots=z.occupied_spots,
                price_per_hour=z.price_per_hour,
                is_open=z.is_open,
            )
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the SQLite database with demo parking data.")
    parser.add_argument("--reset", action="store_true", help="Clear existing zones/spots/events before seeding.")
    args = parser.parse_args()

    with session_scope() as db:
        seed_demo(db, reset=args.reset)
    print("Demo data loaded.")


if __name__ == "__main__":
    main()
