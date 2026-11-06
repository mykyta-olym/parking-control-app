# app/routers/admin.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional

from app.core.security import require_admin
from app.db.session import get_db
from app.schemas.auth import Claims
from app.schemas.ingest import ZonesSnapshotIn, ZonesSnapshotOut
from app.schemas.admin import (
    ZoneCreateIn,
    ZoneUpdateIn,
    ZoneAdminOut,
    ZoneListOut,
    OverviewStatsOut,
    TrendAnalyticsOut,
    ZoneAnalyticsOut,
    DistrictAnalyticsOut,
    ActivityLogListOut,
    DashboardSummaryOut,
    DistrictCreateIn,
    DistrictOut,
    DistrictListOut,
)
from app.services.admin_service import (
    list_zones_admin,
    get_zone_admin,
    create_zone,
    update_zone,
    delete_zone,
    get_overview_stats,
    get_trend_analytics,
    get_zone_analytics,
    get_district_analytics,
    get_activity_logs,
    get_dashboard_summary,
    list_districts,
    create_district,
    delete_district,
)
from app.services.ingest_service import apply_zone_snapshot

router = APIRouter(prefix="/admin", tags=["Admin"])


# =====================
# Ingest Endpoint
# =====================

@router.post(
    "/ingest/snapshot",
    response_model=ZonesSnapshotOut,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest zone occupancy snapshot",
)
def ingest_snapshot(
    payload: ZonesSnapshotIn,
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> ZonesSnapshotOut:
    """Store a batch of zone-level counters in a single transaction."""
    try:
        result = apply_zone_snapshot(db, payload)
        db.commit()
        return result
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid snapshot payload.",
        ) from exc


# =====================
# District Endpoints
# =====================

@router.get(
    "/districts",
    response_model=DistrictListOut,
    summary="List all districts",
)
def read_districts(
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> DistrictListOut:
    """List all districts with zone statistics."""
    return list_districts(db)


@router.post(
    "/districts",
    response_model=DistrictOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create new district",
)
def create_district_admin(
    data: DistrictCreateIn,
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> DistrictOut:
    """Create a new district."""
    try:
        district = create_district(db, data)
        db.commit()
        return district
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"District with id '{data.id}' already exists",
        )


@router.delete(
    "/districts/{district_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete district",
    response_model=None,
)
def delete_district_admin(
    district_id: str,
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
):
    """Delete a district."""
    if not delete_district(db, district_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="District not found",
        )
    db.commit()


@router.get(
    "/districts/{district_id}/analytics",
    response_model=DistrictAnalyticsOut,
    summary="Get district analytics",
)
def read_district_analytics(
    district_id: str,
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> DistrictAnalyticsOut:
    """Get detailed analytics for a specific district."""
    analytics = get_district_analytics(db, district_id)
    if not analytics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="District not found",
        )
    return analytics


# =====================
# Dashboard Endpoints
# =====================

@router.get(
    "/dashboard",
    response_model=DashboardSummaryOut,
    summary="Get dashboard summary",
)
def read_dashboard(
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> DashboardSummaryOut:
    """Get complete dashboard summary with overview, alerts, and top zones."""
    return get_dashboard_summary(db)


@router.get(
    "/stats/overview",
    response_model=OverviewStatsOut,
    summary="Get overview statistics",
)
def read_overview_stats(
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> OverviewStatsOut:
    """Get overall parking statistics."""
    return get_overview_stats(db)


@router.get(
    "/stats/trends",
    response_model=TrendAnalyticsOut,
    summary="Get trend analytics",
)
def read_trend_analytics(
    period: str = Query("week", description="Period: day, week, or month"),
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> TrendAnalyticsOut:
    """Get trend analytics for charts."""
    if period not in ["day", "week", "month"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Period must be 'day', 'week', or 'month'",
        )
    return get_trend_analytics(db, period)


# =====================
# Zone CRUD Endpoints
# =====================

@router.get(
    "/zones",
    response_model=ZoneListOut,
    summary="List all zones (admin)",
)
def read_zones_admin(
    district: Optional[str] = Query(None, description="Filter by district"),
    zone_type: Optional[str] = Query(None, description="Filter by zone type"),
    is_open: Optional[bool] = Query(None, description="Filter by open status"),
    search: Optional[str] = Query(None, description="Search in name, address, id"),
    sort_by: str = Query("name", description="Sort by field"),
    sort_order: str = Query("asc", description="Sort order: asc or desc"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> ZoneListOut:
    """List all parking zones with admin details."""
    return list_zones_admin(
        db,
        district=district,
        zone_type=zone_type,
        is_open=is_open,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/zones/{zone_id}",
    response_model=ZoneAdminOut,
    summary="Get zone details (admin)",
)
def read_zone_admin(
    zone_id: str,
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> ZoneAdminOut:
    """Get a single parking zone with admin details."""
    zone = get_zone_admin(db, zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found",
        )
    return zone


@router.post(
    "/zones",
    response_model=ZoneAdminOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create new zone",
)
def create_zone_admin(
    data: ZoneCreateIn,
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> ZoneAdminOut:
    """Create a new parking zone."""
    try:
        zone = create_zone(db, data)
        db.commit()
        return zone
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Zone with id '{data.id}' already exists",
        )


@router.put(
    "/zones/{zone_id}",
    response_model=ZoneAdminOut,
    summary="Update zone",
)
def update_zone_admin(
    zone_id: str,
    data: ZoneUpdateIn,
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> ZoneAdminOut:
    """Update an existing parking zone."""
    zone = update_zone(db, zone_id, data)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found",
        )
    db.commit()
    return zone


@router.delete(
    "/zones/{zone_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete zone",
    response_model=None,
)
def delete_zone_admin(
    zone_id: str,
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
):
    """Delete a parking zone."""
    if not delete_zone(db, zone_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found",
        )
    db.commit()


# =====================
# Zone Analytics Endpoints
# =====================

@router.get(
    "/zones/{zone_id}/analytics",
    response_model=ZoneAnalyticsOut,
    summary="Get zone analytics",
)
def read_zone_analytics(
    zone_id: str,
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> ZoneAnalyticsOut:
    """Get detailed analytics for a specific zone."""
    analytics = get_zone_analytics(db, zone_id)
    if not analytics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found",
        )
    return analytics


# =====================
# Activity Log Endpoints
# =====================

@router.get(
    "/activity",
    response_model=ActivityLogListOut,
    summary="Get activity logs",
)
def read_activity_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    action: Optional[str] = Query(None, description="Filter by action type"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> ActivityLogListOut:
    """Get activity logs for audit trail."""
    return get_activity_logs(
        db,
        limit=limit,
        offset=offset,
        action=action,
        entity_type=entity_type,
    )


# =====================
# Bulk Operations
# =====================

@router.post(
    "/zones/bulk-update-status",
    response_model=dict,
    summary="Bulk update zone status",
)
def bulk_update_zone_status(
    zone_ids: list[str],
    is_open: bool,
    db: Session = Depends(get_db),
    _principal: Claims = Depends(require_admin),
) -> dict:
    """Bulk update open/closed status for multiple zones."""
    updated = 0
    for zone_id in zone_ids:
        zone = update_zone(db, zone_id, ZoneUpdateIn(is_open=is_open))
        if zone:
            updated += 1
    db.commit()
    return {"updated": updated, "total": len(zone_ids)}
