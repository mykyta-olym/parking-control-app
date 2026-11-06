# app/services/admin_service.py
from __future__ import annotations
from datetime import datetime, timedelta, date, timezone
from typing import Optional, List, Dict, Any, Iterable
import uuid
import random
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc
from sqlalchemy.exc import IntegrityError

from app.models.zone import ParkingZone
from app.models.snapshot import ZoneSnapshot
from app.schemas.admin import (
    ZoneCreateIn,
    ZoneUpdateIn,
    ZoneAdminOut,
    ZoneListOut,
    OverviewStatsOut,
    DistrictStatsOut,
    HourlyStatsOut,
    DailyStatsOut,
    TrendDataPoint,
    TrendAnalyticsOut,
    ZoneAnalyticsOut,
    DistrictAnalyticsOut,
    ActivityLogOut,
    ActivityLogListOut,
    DashboardSummaryOut,
    DistrictCreateIn,
    DistrictOut,
    DistrictListOut,
)

# District configuration (default districts)
DISTRICT_CONFIG = {
    "ZAPAD": {"label": "Západ", "color": "#3498db"},
    "SEVER": {"label": "Sever", "color": "#e74c3c"},
    "STARE MESTO": {"label": "Staré Mesto", "color": "#2ecc71"},
    "JUH": {"label": "Juh", "color": "#f1c40f"},
}

# In-memory storage for custom districts (in production, use a database table)
_custom_districts: Dict[str, Dict[str, Any]] = {}


# =====================
# District Operations
# =====================

def list_districts(db: Session) -> DistrictListOut:
    """List all districts that have zones (real data only, no hardcoded districts)."""
    # Get zone counts per district from database
    zones = list(db.scalars(select(ParkingZone)))
    
    district_stats: Dict[str, Dict[str, Any]] = {}
    for z in zones:
        district_code = z.district.upper() if z.district else "UNKNOWN"
        if district_code not in district_stats:
            district_stats[district_code] = {
                "zone_count": 0,
                "total_spots": 0,
                "free_spots": 0,
            }
        district_stats[district_code]["zone_count"] += 1
        district_stats[district_code]["total_spots"] += z.total_spots
        district_stats[district_code]["free_spots"] += max(z.total_spots - z.occupied_spots, 0)
    
    districts = []
    
    # Only return districts that actually have zones (no hardcoded defaults)
    for district_code, stats in district_stats.items():
        # Get config for known districts, or create default for unknown ones
        config = DISTRICT_CONFIG.get(district_code, {"label": district_code, "color": "#95a5a6"})
        districts.append(DistrictOut(
            id=district_code,
            name=district_code,
            label=config["label"],
            color=config["color"],
            description=None,
            zone_count=stats["zone_count"],
            total_spots=stats["total_spots"],
            free_spots=stats["free_spots"],
        ))
    
    # Add custom districts (those created via API)
    for district_id, data in _custom_districts.items():
        if district_id not in district_stats:
            # Only add if not already counted from zones
            districts.append(DistrictOut(
                id=district_id,
                name=data["name"],
                label=data["label"],
                color=data["color"],
                description=data.get("description"),
                zone_count=0,
                total_spots=0,
                free_spots=0,
            ))
    
    return DistrictListOut(total=len(districts), items=districts)


def create_district(db: Session, data: DistrictCreateIn) -> DistrictOut:
    """Create a new district."""
    district_id = data.id.upper()
    
    # Check if exists in default config
    if district_id in DISTRICT_CONFIG:
        raise IntegrityError("District already exists", None, None)
    
    # Check if exists in custom districts
    if district_id in _custom_districts:
        raise IntegrityError("District already exists", None, None)
    
    # Store custom district
    _custom_districts[district_id] = {
        "name": data.name,
        "label": data.label,
        "color": data.color,
        "description": data.description,
    }
    
    return DistrictOut(
        id=district_id,
        name=data.name,
        label=data.label,
        color=data.color,
        description=data.description,
        zone_count=0,
        total_spots=0,
        free_spots=0,
    )


def delete_district(db: Session, district_id: str) -> bool:
    """Delete a custom district."""
    district_id = district_id.upper()
    
    # Cannot delete default districts
    if district_id in DISTRICT_CONFIG:
        return False
    
    # Check if exists in custom districts
    if district_id not in _custom_districts:
        return False
    
    # Check if any zones use this district
    zones_using = db.scalars(
        select(ParkingZone).filter(ParkingZone.district == district_id)
    ).first()
    
    if zones_using:
        return False  # Cannot delete district with zones
    
    del _custom_districts[district_id]
    return True


def _zone_to_admin_out(zone: ParkingZone) -> ZoneAdminOut:
    """Convert ParkingZone model to ZoneAdminOut schema."""
    free_spots = max(zone.total_spots - zone.occupied_spots, 0)
    occupancy_rate = (zone.occupied_spots / zone.total_spots * 100) if zone.total_spots > 0 else 0.0
    
    return ZoneAdminOut(
        id=zone.id,
        name=zone.name,
        type=zone.type,
        district=zone.district,
        polygon=zone.polygon,
        address=zone.address,
        description=zone.description,
        lat=zone.lat,
        lon=zone.lon,
        price_label=zone.price_label,
        price_per_hour=zone.price_per_hour,
        opening_hours=zone.opening_hours,
        is_open=zone.is_open,
        features=zone.features or [],
        total_spots=zone.total_spots,
        occupied_spots=zone.occupied_spots,
        free_spots=free_spots,
        occupancy_rate=round(occupancy_rate, 1),
        last_update=zone.last_update,
        created_at=None,  # Can be added if model has it
    )


# =====================
# Zone CRUD Operations
# =====================

def list_zones_admin(
    db: Session,
    district: Optional[str] = None,
    zone_type: Optional[str] = None,
    is_open: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    limit: int = 100,
    offset: int = 0,
) -> ZoneListOut:
    """List all zones with admin details and filtering."""
    stmt = select(ParkingZone)
    
    # Apply filters
    if district:
        stmt = stmt.filter(ParkingZone.district == district.upper())
    if zone_type:
        stmt = stmt.filter(ParkingZone.type == zone_type)
    if is_open is not None:
        stmt = stmt.filter(ParkingZone.is_open == is_open)
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.filter(
            (ParkingZone.name.ilike(search_pattern)) |
            (ParkingZone.address.ilike(search_pattern)) |
            (ParkingZone.id.ilike(search_pattern))
        )
    
    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0
    
    # Apply sorting
    # Handle computed fields
    if sort_by == "free_spots":
        sort_column = ParkingZone.total_spots - ParkingZone.occupied_spots
    elif sort_by == "occupancy_rate":
        # Use occupied_spots/total_spots as proxy for occupancy rate
        sort_column = ParkingZone.occupied_spots
    else:
        sort_column = getattr(ParkingZone, sort_by, ParkingZone.name)
    
    if sort_order.lower() == "desc":
        stmt = stmt.order_by(desc(sort_column))
    else:
        stmt = stmt.order_by(sort_column)
    
    # Apply pagination
    stmt = stmt.offset(offset).limit(limit)
    
    zones = list(db.scalars(stmt))
    items = [_zone_to_admin_out(z) for z in zones]
    
    return ZoneListOut(total=total, items=items)


def get_zone_admin(db: Session, zone_id: str) -> Optional[ZoneAdminOut]:
    """Get a single zone with admin details."""
    zone = db.get(ParkingZone, zone_id)
    if not zone:
        return None
    return _zone_to_admin_out(zone)


def create_zone(db: Session, data: ZoneCreateIn) -> ZoneAdminOut:
    """Create a new parking zone."""
    zone = ParkingZone(
        id=data.id,
        name=data.name,
        type=data.type,
        district=data.district,
        polygon=data.polygon,
        address=data.address,
        description=data.description,
        lat=data.lat,
        lon=data.lon,
        price_label=data.price_label,
        price_per_hour=data.price_per_hour,
        opening_hours=data.opening_hours,
        is_open=data.is_open,
        features=data.features,
        total_spots=data.total_spots,
        occupied_spots=data.occupied_spots,
        last_update=datetime.utcnow(),
    )
    db.add(zone)
    db.flush()
    return _zone_to_admin_out(zone)


def update_zone(db: Session, zone_id: str, data: ZoneUpdateIn) -> Optional[ZoneAdminOut]:
    """Update an existing parking zone."""
    zone = db.get(ParkingZone, zone_id)
    if not zone:
        return None
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(zone, field):
            setattr(zone, field, value)
    
    zone.last_update = datetime.utcnow()
    db.flush()
    return _zone_to_admin_out(zone)


def delete_zone(db: Session, zone_id: str) -> bool:
    """Delete a parking zone."""
    zone = db.get(ParkingZone, zone_id)
    if not zone:
        return False
    db.delete(zone)
    db.flush()
    return True


def _latest_snapshot_for_zone(db: Session, zone_id: str) -> ZoneSnapshot | None:
    return (
        db.query(ZoneSnapshot)
        .filter(ZoneSnapshot.zone_id == zone_id)
        .order_by(ZoneSnapshot.ts.desc())
        .first()
    )


def _bucket_range(start: datetime, points: int, delta: timedelta) -> Iterable[datetime]:
    for i in range(points):
        yield start + delta * i


# =====================
# Analytics Functions
# =====================

def get_overview_stats(db: Session) -> OverviewStatsOut:
    """Get overall dashboard statistics."""
    zones = list(db.scalars(select(ParkingZone)))
    
    total_zones = len(zones)
    total_spots = sum(z.total_spots for z in zones)
    occupied_spots = sum(z.occupied_spots for z in zones)
    free_spots = total_spots - occupied_spots
    overall_occupancy = (occupied_spots / total_spots * 100) if total_spots > 0 else 0.0
    
    # Zones by type
    zones_by_type: Dict[str, int] = {}
    for z in zones:
        zones_by_type[z.type] = zones_by_type.get(z.type, 0) + 1
    
    # District stats
    district_data: Dict[str, Dict[str, Any]] = {}
    for z in zones:
        if z.district not in district_data:
            district_data[z.district] = {
                "total_zones": 0,
                "total_spots": 0,
                "occupied_spots": 0,
            }
        district_data[z.district]["total_zones"] += 1
        district_data[z.district]["total_spots"] += z.total_spots
        district_data[z.district]["occupied_spots"] += z.occupied_spots
    
    districts = []
    for district_code, data in district_data.items():
        config = DISTRICT_CONFIG.get(district_code, {"label": district_code, "color": "#95a5a6"})
        free = data["total_spots"] - data["occupied_spots"]
        rate = (data["occupied_spots"] / data["total_spots"] * 100) if data["total_spots"] > 0 else 0.0
        districts.append(DistrictStatsOut(
            district=district_code,
            district_label=config["label"],
            total_zones=data["total_zones"],
            total_spots=data["total_spots"],
            occupied_spots=data["occupied_spots"],
            free_spots=free,
            occupancy_rate=round(rate, 1),
            color=config["color"],
        ))

    # Hourly stats from last 24h snapshots (fallback to pattern if empty)
    last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    snaps = list(db.query(ZoneSnapshot).filter(ZoneSnapshot.ts >= last_24h))
    hourly_groups: dict[int, list[ZoneSnapshot]] = {}
    for snap in snaps:
        hourly_groups.setdefault(snap.ts.hour, []).append(snap)

    hourly_stats: list[HourlyStatsOut] = []
    for hour in range(24):
        hour_snaps = hourly_groups.get(hour, [])
        if hour_snaps:
            total = sum(s.total_spots for s in hour_snaps)
            occ = sum(s.occupied_spots for s in hour_snaps)
            rate = (occ / total * 100) if total > 0 else 0.0
            avg_occ = occ / len(hour_snaps)
            avg_total = total / len(hour_snaps)
            avg_free = max(avg_total - avg_occ, 0)
        else:
            rate = avg_occ = avg_free = 0.0
        hourly_stats.append(HourlyStatsOut(
            hour=hour,
            avg_occupied=round(avg_occ, 1),
            avg_free=round(avg_free, 1),
            avg_occupancy_rate=round(rate, 1),
        ))
    
    return OverviewStatsOut(
        total_zones=total_zones,
        total_spots=total_spots,
        occupied_spots=occupied_spots,
        free_spots=free_spots,
        overall_occupancy_rate=round(overall_occupancy, 1),
        zones_by_type=zones_by_type,
        districts=districts,
        hourly_stats=hourly_stats,
    )


def _generate_hourly_pattern() -> List[HourlyStatsOut]:
    """Generate realistic hourly occupancy pattern."""
    # Typical parking occupancy pattern throughout the day
    base_pattern = [
        15, 12, 10, 8, 7, 8, 15, 35, 55, 70, 80, 85,  # 0-11
        82, 78, 75, 72, 68, 65, 55, 45, 35, 28, 22, 18,  # 12-23
    ]
    
    stats = []
    for hour, rate in enumerate(base_pattern):
        # Add some randomness
        rate = rate + random.randint(-5, 5)
        rate = max(5, min(95, rate))
        stats.append(HourlyStatsOut(
            hour=hour,
            avg_occupied=rate,
            avg_free=100 - rate,
            avg_occupancy_rate=float(rate),
        ))
    return stats


def get_trend_analytics(db: Session, period: str = "week") -> TrendAnalyticsOut:
    """Get trend analytics for charts based on stored snapshots."""
    now = datetime.utcnow()

    if period == "day":
        points = 24
        delta = timedelta(hours=1)
        start = now - timedelta(hours=24)
        bucket_fmt = "%Y-%m-%d %H"
        label_fmt = "%H:00"
    elif period == "month":
        points = 30
        delta = timedelta(days=1)
        start = now - timedelta(days=30)
        bucket_fmt = "%Y-%m-%d"
        label_fmt = "%d.%m"
    else:  # week
        points = 7
        delta = timedelta(days=1)
        start = now - timedelta(days=7)
        bucket_fmt = "%Y-%m-%d"
        label_fmt = "%d.%m"

    snapshot_rows = db.execute(
        select(
            func.strftime(bucket_fmt, ZoneSnapshot.ts).label("bucket"),
            func.sum(ZoneSnapshot.occupied_spots).label("occ"),
            func.sum(ZoneSnapshot.total_spots).label("total"),
            func.sum(ZoneSnapshot.occupied_spots * func.coalesce(ZoneSnapshot.price_per_hour, 0)).label("revenue"),
        )
        .where(ZoneSnapshot.ts >= start)
        .group_by("bucket")
        .order_by("bucket")
    ).all()
    bucket_data = {row.bucket: row for row in snapshot_rows}

    occupancy_trend: List[TrendDataPoint] = []
    revenue_trend: List[TrendDataPoint] = []

    for bucket_start in _bucket_range(start, points, delta):
        key = bucket_start.strftime(bucket_fmt)
        label = bucket_start.strftime(label_fmt)
        row = bucket_data.get(key)

        if row and row.total:
            occupancy = round((row.occ / row.total) * 100, 1)
            revenue = round(row.revenue or 0, 2)
        else:
            occupancy = 0.0
            revenue = 0.0

        occupancy_trend.append(
            TrendDataPoint(timestamp=bucket_start, value=occupancy, label=label)
        )
        revenue_trend.append(
            TrendDataPoint(timestamp=bucket_start, value=revenue, label=label)
        )

    return TrendAnalyticsOut(period=period, occupancy_trend=occupancy_trend, revenue_estimate_trend=revenue_trend)


def get_zone_analytics(db: Session, zone_id: str) -> Optional[ZoneAnalyticsOut]:
    """Get detailed analytics for a specific zone using stored snapshots."""
    zone = db.get(ParkingZone, zone_id)
    if not zone:
        return None

    latest_snapshot = _latest_snapshot_for_zone(db, zone_id)
    current_total = latest_snapshot.total_spots if latest_snapshot else zone.total_spots
    current_occupied = latest_snapshot.occupied_spots if latest_snapshot else zone.occupied_spots
    current_rate = (current_occupied / current_total * 100) if current_total > 0 else 0.0

    # Gather last 7 days of snapshots
    start_day = datetime.combine(date.today() - timedelta(days=6), datetime.min.time())
    snapshots = list(
        db.query(ZoneSnapshot)
        .filter(ZoneSnapshot.zone_id == zone_id, ZoneSnapshot.ts >= start_day)
        .order_by(ZoneSnapshot.ts)
    )

    # Daily stats
    daily_buckets: dict[date, list[ZoneSnapshot]] = {}
    for snap in snapshots:
        daily_buckets.setdefault(snap.ts.date(), []).append(snap)

    daily_stats: list[DailyStatsOut] = []
    for i in range(7):
        day = (date.today() - timedelta(days=i))
        snaps = daily_buckets.get(day, [])
        if snaps:
            avg_occ = sum(s.occupied_spots for s in snaps) / len(snaps)
            avg_total = sum(s.total_spots for s in snaps) / len(snaps)
            peak_snapshot = max(snaps, key=lambda s: s.occupied_spots)
            avg_free = avg_total - avg_occ
            avg_rate = (avg_occ / avg_total * 100) if avg_total > 0 else 0.0
            peak_hour = peak_snapshot.ts.hour
            peak_occupied = peak_snapshot.occupied_spots
        else:
            avg_occ = avg_free = avg_rate = 0.0
            peak_hour = 0
            peak_occupied = 0
            avg_total = current_total

        daily_stats.append(
            DailyStatsOut(
                date=day,
                total_spots=int(avg_total),
                avg_occupied=round(avg_occ, 1),
                avg_free=round(avg_free, 1),
                peak_occupied=int(peak_occupied),
                peak_hour=peak_hour,
                avg_occupancy_rate=round(avg_rate, 1),
            )
        )

    # Hourly pattern for last 24 hours
    last_24h = datetime.utcnow() - timedelta(hours=24)
    hourly_snaps = (
        db.query(ZoneSnapshot)
        .filter(ZoneSnapshot.zone_id == zone_id, ZoneSnapshot.ts >= last_24h)
        .all()
    )
    hourly_groups: dict[int, list[ZoneSnapshot]] = {}
    for snap in hourly_snaps:
        hourly_groups.setdefault(snap.ts.hour, []).append(snap)

    hourly_pattern: list[HourlyStatsOut] = []
    for hour in range(24):
        snaps = hourly_groups.get(hour, [])
        if snaps:
            avg_occ = sum(s.occupied_spots for s in snaps) / len(snaps)
            avg_total = sum(s.total_spots for s in snaps) / len(snaps)
            avg_rate = (avg_occ / avg_total * 100) if avg_total > 0 else 0.0
        else:
            avg_occ = avg_rate = 0.0
            avg_total = current_total

        hourly_pattern.append(
            HourlyStatsOut(
                hour=hour,
                avg_occupied=round(avg_occ, 1),
                avg_free=round(max(avg_total - avg_occ, 0), 1),
                avg_occupancy_rate=round(avg_rate, 1),
            )
        )

    peak_hours = [h.hour for h in hourly_pattern if h.avg_occupancy_rate > 70]

    # Revenue estimate: average daily revenue over last 7 days
    revenue_by_day: dict[date, float] = {}
    for snap in snapshots:
        price = snap.price_per_hour or 0.0
        revenue_by_day.setdefault(snap.ts.date(), 0.0)
        revenue_by_day[snap.ts.date()] += snap.occupied_spots * price
    avg_daily_revenue = 0.0
    if revenue_by_day:
        avg_daily_revenue = sum(revenue_by_day.values()) / len(revenue_by_day)

    return ZoneAnalyticsOut(
        zone_id=zone.id,
        zone_name=zone.name,
        current_occupancy_rate=round(current_rate, 1),
        daily_stats=daily_stats,
        hourly_pattern=hourly_pattern,
        peak_hours=peak_hours,
        avg_daily_revenue_estimate=round(avg_daily_revenue, 2),
    )


def get_district_analytics(db: Session, district_id: str) -> Optional[DistrictAnalyticsOut]:
    """Get detailed analytics for a specific district using stored snapshots."""
    district_id_upper = district_id.upper()

    zones = list(db.scalars(select(ParkingZone).filter(ParkingZone.district == district_id_upper)))
    if not zones:
        config = DISTRICT_CONFIG.get(district_id_upper)
        custom = _custom_districts.get(district_id_upper)
        if not config and not custom:
            return None
        label = (config or custom or {}).get("label", district_id_upper)
        color = (config or custom or {}).get("color", "#95a5a6")
        return DistrictAnalyticsOut(
            district_id=district_id_upper,
            district_name=district_id_upper,
            district_label=label,
            color=color,
            total_zones=0,
            total_spots=0,
            occupied_spots=0,
            free_spots=0,
            current_occupancy_rate=0.0,
            daily_stats=[],
            hourly_pattern=[],
            peak_hours=[],
            avg_daily_revenue_estimate=0.0,
            zones=[],
        )

    zone_ids = [z.id for z in zones]
    config = DISTRICT_CONFIG.get(district_id_upper, {})
    custom = _custom_districts.get(district_id_upper, {})
    label = config.get("label") or custom.get("label") or district_id_upper
    color = config.get("color") or custom.get("color") or "#95a5a6"

    # Latest snapshots per zone for current state
    latest_snapshots: dict[str, ZoneSnapshot] = {}
    for zone_id in zone_ids:
        snap = _latest_snapshot_for_zone(db, zone_id)
        if snap:
            latest_snapshots[zone_id] = snap

    current_total = sum((latest_snapshots.get(z.id).total_spots if z.id in latest_snapshots else z.total_spots) for z in zones)
    current_occupied = sum((latest_snapshots.get(z.id).occupied_spots if z.id in latest_snapshots else z.occupied_spots) for z in zones)
    free_spots = current_total - current_occupied
    current_rate = (current_occupied / current_total * 100) if current_total > 0 else 0.0

    # Past 7 days snapshots
    start_day = datetime.combine(date.today() - timedelta(days=6), datetime.min.time())
    snapshots = list(
        db.query(ZoneSnapshot)
        .filter(ZoneSnapshot.zone_id.in_(zone_ids), ZoneSnapshot.ts >= start_day)
        .order_by(ZoneSnapshot.ts)
    )

    # Daily stats aggregated
    daily_groups: dict[date, list[ZoneSnapshot]] = {}
    for snap in snapshots:
        daily_groups.setdefault(snap.ts.date(), []).append(snap)

    daily_stats: list[DailyStatsOut] = []
    for i in range(7):
        day = date.today() - timedelta(days=i)
        snaps = daily_groups.get(day, [])
        if snaps:
            total = sum(s.total_spots for s in snaps)
            occ = sum(s.occupied_spots for s in snaps)
            avg_rate = (occ / total * 100) if total > 0 else 0.0
            peak_snapshot = max(snaps, key=lambda s: s.occupied_spots)
            peak_hour = peak_snapshot.ts.hour
            avg_occ = occ / len(snaps)
            avg_total = total / len(snaps)
            avg_free = avg_total - avg_occ
            peak_occupied = peak_snapshot.occupied_spots
        else:
            total = current_total
            avg_rate = avg_occ = avg_free = 0.0
            peak_hour = 0
            peak_occupied = 0

        daily_stats.append(
            DailyStatsOut(
                date=day,
                total_spots=total,
                avg_occupied=round(avg_occ, 1),
                avg_free=round(avg_free, 1),
                peak_occupied=int(peak_occupied),
                peak_hour=peak_hour,
                avg_occupancy_rate=round(avg_rate, 1),
            )
        )

    # Hourly pattern for last 24 hours
    last_24h = datetime.utcnow() - timedelta(hours=24)
    hourly_snaps = (
        db.query(ZoneSnapshot)
        .filter(ZoneSnapshot.zone_id.in_(zone_ids), ZoneSnapshot.ts >= last_24h)
        .all()
    )
    hourly_groups: dict[int, list[ZoneSnapshot]] = {}
    for snap in hourly_snaps:
        hourly_groups.setdefault(snap.ts.hour, []).append(snap)

    hourly_pattern: list[HourlyStatsOut] = []
    for hour in range(24):
        snaps = hourly_groups.get(hour, [])
        if snaps:
            total = sum(s.total_spots for s in snaps)
            occ = sum(s.occupied_spots for s in snaps)
            avg_rate = (occ / total * 100) if total > 0 else 0.0
            avg_occ = occ / len(snaps)
            avg_total = total / len(snaps)
            avg_free = avg_total - avg_occ
        else:
            avg_rate = avg_occ = avg_free = 0.0

        hourly_pattern.append(
            HourlyStatsOut(
                hour=hour,
                avg_occupied=round(avg_occ, 1),
                avg_free=round(avg_free, 1),
                avg_occupancy_rate=round(avg_rate, 1),
            )
        )

    peak_hours = [h.hour for h in hourly_pattern if h.avg_occupancy_rate > 70]

    # Revenue estimate averaged per day
    revenue_by_day: dict[date, float] = {}
    for snap in snapshots:
        price = snap.price_per_hour or 0.0
        revenue_by_day.setdefault(snap.ts.date(), 0.0)
        revenue_by_day[snap.ts.date()] += snap.occupied_spots * price
    avg_daily_revenue = sum(revenue_by_day.values()) / len(revenue_by_day) if revenue_by_day else 0.0

    zones_out = [_zone_to_admin_out(z) for z in zones]

    return DistrictAnalyticsOut(
        district_id=district_id_upper,
        district_name=district_id_upper,
        district_label=label,
        color=color,
        total_zones=len(zones),
        total_spots=current_total,
        occupied_spots=current_occupied,
        free_spots=free_spots,
        current_occupancy_rate=round(current_rate, 1),
        daily_stats=daily_stats,
        hourly_pattern=hourly_pattern,
        peak_hours=peak_hours,
        avg_daily_revenue_estimate=round(avg_daily_revenue, 2),
        zones=zones_out,
    )


# =====================
# Activity Log (Simulated)
# =====================

def get_activity_logs(
    db: Session,
    limit: int = 50,
    offset: int = 0,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
) -> ActivityLogListOut:
    """Get activity logs (simulated for demo)."""
    # In production, this would query an actual activity_logs table
    # For now, we generate some demo data
    
    actions = ["create", "update", "delete", "ingest"]
    entity_types = ["zone", "snapshot"]
    
    zones = list(db.scalars(select(ParkingZone).limit(10)))
    
    logs = []
    now = datetime.utcnow()
    
    for i in range(min(limit, 20)):
        log_action = action if action else random.choice(actions)
        log_entity_type = entity_type if entity_type else random.choice(entity_types)
        
        zone = random.choice(zones) if zones else None
        
        details = None
        if log_action == "update" and zone:
            details = f"Updated occupancy: {zone.occupied_spots}/{zone.total_spots}"
        elif log_action == "ingest":
            details = f"Ingested snapshot with {random.randint(5, 20)} zones"
        elif log_action == "create" and zone:
            details = f"Created zone '{zone.name}'"
        
        logs.append(ActivityLogOut(
            id=str(uuid.uuid4()),
            action=log_action,
            entity_type=log_entity_type,
            entity_id=zone.id if zone else None,
            details=details,
            user="admin",
            timestamp=now - timedelta(minutes=i * random.randint(5, 60)),
        ))
    
    return ActivityLogListOut(total=len(logs), items=logs)


# =====================
# Dashboard Summary
# =====================

def get_dashboard_summary(db: Session) -> DashboardSummaryOut:
    """Get complete dashboard summary."""
    overview = get_overview_stats(db)
    activity = get_activity_logs(db, limit=10)
    
    # Get top zones
    zones = list(db.scalars(select(ParkingZone)))
    
    # Sort by occupancy rate for top occupied
    zones_with_rate = [(z, z.occupied_spots / z.total_spots if z.total_spots > 0 else 0) for z in zones]
    zones_with_rate.sort(key=lambda x: x[1], reverse=True)
    top_occupied = [_zone_to_admin_out(z) for z, _ in zones_with_rate[:5]]
    
    # Sort by free spots for top available
    zones_with_free = [(z, z.total_spots - z.occupied_spots) for z in zones]
    zones_with_free.sort(key=lambda x: x[1], reverse=True)
    top_available = [_zone_to_admin_out(z) for z, _ in zones_with_free[:5]]
    
    # Generate alerts
    alerts = []
    for z in zones:
        if z.total_spots > 0:
            rate = z.occupied_spots / z.total_spots
            if rate > 0.9:
                alerts.append(f"⚠️ High occupancy alert: {z.name} ({int(rate*100)}% full)")
            elif rate < 0.1 and z.is_open:
                alerts.append(f"ℹ️ Low utilization: {z.name} ({int(rate*100)}% occupied)")
    
    return DashboardSummaryOut(
        overview=overview,
        recent_activity=activity.items,
        alerts=alerts[:5],  # Limit to 5 alerts
        top_occupied_zones=top_occupied,
        top_available_zones=top_available,
    )
