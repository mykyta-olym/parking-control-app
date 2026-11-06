# app/schemas/parking.py
from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class SpotOut(BaseModel):
    """A minimal representation of a parking spot (for detailed responses or future use)."""
    model_config = ConfigDict(from_attributes=True, extra="ignore")
    id: str
    zone_id: str
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    type: Literal["regular", "ev", "ztp", "reserved"]

class ZoneCountersOut(BaseModel):
    """Aggregated counters per zone (based on the latest spot events)."""
    free: int = Field(ge=0)
    occupied: int = Field(ge=0)
    total: int = Field(ge=0)

class ZoneOut(BaseModel):
    """A zone with geometry and calculated counters."""
    model_config = ConfigDict(from_attributes=True, extra="ignore")
    id: str
    name: str
    type: Literal["street", "garage", "lot", "private"]
    district: Literal["ZAPAD", "SEVER", "STARE MESTO", "JUH"]
    polygon: Dict[str, Any]  # GeoJSON
    counters: ZoneCountersOut
    newest_ts: Optional[datetime] = None

class ParkingListOut(BaseModel):
    """Response for GET /api/v1/parking: a list of zones with counters."""
    server_ts: datetime
    zones: List[ZoneOut] = Field(default_factory=list)


def _to_camel(string: str) -> str:
    parts = string.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class DistrictMetaOut(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    code: Literal["ZAPAD", "SEVER", "STARE MESTO", "JUH"]
    label: str
    color: str


class CoordinatesOut(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    latitude: float
    longitude: float


class ParkingFacilityOut(BaseModel):
    """Detailed parking facility description used by mobile clients."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    id: str
    name: str
    district: DistrictMetaOut
    address: Optional[str] = None
    description: Optional[str] = None
    coordinates: Optional[CoordinatesOut] = None
    polygon: Optional[Dict[str, Any]] = None
    features: List[str] = Field(default_factory=list)
    opening_hours: Optional[str] = None
    is_open: bool
    total_spots: int = Field(ge=0)
    free_spots: int = Field(ge=0)
    price: Optional[str] = None
    price_per_hour: Optional[float] = Field(default=None, ge=0)
    last_update: Optional[datetime] = None


class ParkingFacilitiesListOut(BaseModel):
    """List response for GET /api/v1/parkings."""

    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    server_ts: datetime
    items: List[ParkingFacilityOut] = Field(default_factory=list)
