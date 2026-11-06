# app/schemas/admin.py
from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict


def _to_camel(string: str) -> str:
    parts = string.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


# =====================
# District Schemas
# =====================

class DistrictCreateIn(BaseModel):
    """Schema for creating a new district."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    id: str = Field(..., min_length=1, max_length=64, description="Unique district identifier")
    name: str = Field(..., min_length=1, max_length=120)
    label: str = Field(..., min_length=1, max_length=120)
    color: str = Field("#95a5a6", max_length=16)
    description: Optional[str] = None


class DistrictOut(BaseModel):
    """District output for admin panel."""
    model_config = ConfigDict(from_attributes=True, alias_generator=_to_camel, populate_by_name=True)
    
    id: str
    name: str
    label: str
    color: str
    description: Optional[str] = None
    zone_count: int = 0
    total_spots: int = 0
    free_spots: int = 0


class DistrictListOut(BaseModel):
    """List of districts for admin panel."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    total: int
    items: List[DistrictOut] = Field(default_factory=list)


# =====================
# Zone/Parking CRUD Schemas
# =====================

class ZoneCreateIn(BaseModel):
    """Schema for creating a new parking zone."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    id: str = Field(..., min_length=1, max_length=64, description="Unique zone identifier")
    name: str = Field(..., min_length=1, max_length=120)
    type: Literal["street", "garage", "lot", "private"] = "street"
    district: Literal["ZAPAD", "SEVER", "STARE MESTO", "JUH"]
    polygon: Dict[str, Any] = Field(default_factory=lambda: {"type": "Polygon", "coordinates": []})
    address: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lon: Optional[float] = Field(None, ge=-180, le=180)
    price_label: Optional[str] = Field(None, max_length=64)
    price_per_hour: Optional[float] = Field(None, ge=0)
    opening_hours: Optional[str] = Field(None, max_length=120)
    is_open: bool = True
    features: List[str] = Field(default_factory=list)
    total_spots: int = Field(0, ge=0)
    occupied_spots: int = Field(0, ge=0)


class ZoneUpdateIn(BaseModel):
    """Schema for updating an existing parking zone."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    type: Optional[Literal["street", "garage", "lot", "private"]] = None
    district: Optional[Literal["ZAPAD", "SEVER", "STARE MESTO", "JUH"]] = None
    polygon: Optional[Dict[str, Any]] = None
    address: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lon: Optional[float] = Field(None, ge=-180, le=180)
    price_label: Optional[str] = Field(None, max_length=64)
    price_per_hour: Optional[float] = Field(None, ge=0)
    opening_hours: Optional[str] = Field(None, max_length=120)
    is_open: Optional[bool] = None
    features: Optional[List[str]] = None
    total_spots: Optional[int] = Field(None, ge=0)
    occupied_spots: Optional[int] = Field(None, ge=0)


class ZoneAdminOut(BaseModel):
    """Detailed zone output for admin panel."""
    model_config = ConfigDict(from_attributes=True, alias_generator=_to_camel, populate_by_name=True)
    
    id: str
    name: str
    type: str
    district: str
    polygon: Dict[str, Any]
    address: Optional[str] = None
    description: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    price_label: Optional[str] = None
    price_per_hour: Optional[float] = None
    opening_hours: Optional[str] = None
    is_open: bool
    features: List[str] = Field(default_factory=list)
    total_spots: int
    occupied_spots: int
    free_spots: int = 0
    occupancy_rate: float = 0.0  # percentage 0-100
    last_update: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ZoneListOut(BaseModel):
    """List of zones for admin panel."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    total: int
    items: List[ZoneAdminOut] = Field(default_factory=list)


# =====================
# Analytics Schemas
# =====================

class DailyStatsOut(BaseModel):
    """Daily statistics for a zone or overall."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    date: date
    total_spots: int = 0
    avg_occupied: float = 0.0
    avg_free: float = 0.0
    peak_occupied: int = 0
    peak_hour: int = 0  # 0-23
    avg_occupancy_rate: float = 0.0  # percentage


class HourlyStatsOut(BaseModel):
    """Hourly statistics."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    hour: int  # 0-23
    avg_occupied: float = 0.0
    avg_free: float = 0.0
    avg_occupancy_rate: float = 0.0


class DistrictStatsOut(BaseModel):
    """Statistics per district."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    district: str
    district_label: str
    total_zones: int = 0
    total_spots: int = 0
    occupied_spots: int = 0
    free_spots: int = 0
    occupancy_rate: float = 0.0
    color: str = "#95a5a6"


class OverviewStatsOut(BaseModel):
    """Overall dashboard statistics."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    total_zones: int = 0
    total_spots: int = 0
    occupied_spots: int = 0
    free_spots: int = 0
    overall_occupancy_rate: float = 0.0
    zones_by_type: Dict[str, int] = Field(default_factory=dict)
    districts: List[DistrictStatsOut] = Field(default_factory=list)
    hourly_stats: List[HourlyStatsOut] = Field(default_factory=list)


class TrendDataPoint(BaseModel):
    """Single data point for trend charts."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    timestamp: datetime
    value: float
    label: Optional[str] = None


class TrendAnalyticsOut(BaseModel):
    """Trend analytics data for charts."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    period: str  # "day", "week", "month"
    occupancy_trend: List[TrendDataPoint] = Field(default_factory=list)
    revenue_estimate_trend: List[TrendDataPoint] = Field(default_factory=list)


class ZoneAnalyticsOut(BaseModel):
    """Detailed analytics for a specific zone."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    zone_id: str
    zone_name: str
    current_occupancy_rate: float = 0.0
    daily_stats: List[DailyStatsOut] = Field(default_factory=list)
    hourly_pattern: List[HourlyStatsOut] = Field(default_factory=list)
    peak_hours: List[int] = Field(default_factory=list)
    avg_daily_revenue_estimate: float = 0.0


class DistrictAnalyticsOut(BaseModel):
    """Detailed analytics for a specific district."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    district_id: str
    district_name: str
    district_label: str
    color: str = "#95a5a6"
    total_zones: int = 0
    total_spots: int = 0
    occupied_spots: int = 0
    free_spots: int = 0
    current_occupancy_rate: float = 0.0
    daily_stats: List[DailyStatsOut] = Field(default_factory=list)
    hourly_pattern: List[HourlyStatsOut] = Field(default_factory=list)
    peak_hours: List[int] = Field(default_factory=list)
    avg_daily_revenue_estimate: float = 0.0
    zones: List[ZoneAdminOut] = Field(default_factory=list)


# =====================
# Activity/Audit Log Schemas
# =====================

class ActivityLogOut(BaseModel):
    """Activity log entry for audit trail."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    id: str
    action: str  # "create", "update", "delete", "ingest"
    entity_type: str  # "zone", "spot", "snapshot"
    entity_id: Optional[str] = None
    details: Optional[str] = None
    user: Optional[str] = None
    timestamp: datetime


class ActivityLogListOut(BaseModel):
    """List of activity logs."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    total: int
    items: List[ActivityLogOut] = Field(default_factory=list)


# =====================
# Dashboard Summary Schema
# =====================

class DashboardSummaryOut(BaseModel):
    """Complete dashboard summary for admin panel."""
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    
    overview: OverviewStatsOut
    recent_activity: List[ActivityLogOut] = Field(default_factory=list)
    alerts: List[str] = Field(default_factory=list)  # System alerts/warnings
    top_occupied_zones: List[ZoneAdminOut] = Field(default_factory=list)
    top_available_zones: List[ZoneAdminOut] = Field(default_factory=list)
