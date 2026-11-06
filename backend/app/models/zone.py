# app/models/zone.py
from datetime import datetime
from typing import Optional, List, Dict
from sqlalchemy import String, JSON, Float, Boolean, Text, CheckConstraint, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.types import ZoneType, District

class ParkingZone(Base):
    __tablename__ = "parking_zones"
    __table_args__ = (
        CheckConstraint("lat >= -90 AND lat <= 90", name="ck_zone_lat_range"),
        CheckConstraint("lon >= -180 AND lon <= 180", name="ck_zone_lon_range"),
        CheckConstraint("total_spots >= 0", name="ck_zone_total_nonneg"),
        CheckConstraint("occupied_spots >= 0", name="ck_zone_occupied_nonneg"),
        CheckConstraint("occupied_spots <= total_spots", name="ck_zone_occupied_le_total"),
    )

    id:   Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    type: Mapped[ZoneType] = mapped_column(
        String(24), nullable=False
    )
    district: Mapped[District] = mapped_column(String(24), nullable=False)
    polygon: Mapped[Dict] = mapped_column(JSON, nullable=False)  # GeoJSON
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    price_label: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    price_per_hour: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    opening_hours: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    is_open: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    features: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    total_spots: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    occupied_spots: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_update: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    spots:   Mapped[List["ParkingSpot"]] = relationship(back_populates="zone", cascade="all, delete-orphan")
    devices: Mapped[List["Device"]]      = relationship(back_populates="zone", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<ParkingZone id={self.id} name={self.name} district={self.district}>"
