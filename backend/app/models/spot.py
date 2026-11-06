# app/models/spot.py
from typing import Optional
from sqlalchemy import String, Float, ForeignKey, Integer, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.types import SpotType

class ParkingSpot(Base):
    __tablename__ = "parking_spots"
    __table_args__ = (
        CheckConstraint("lat >= -90 AND lat <= 90", name="ck_spot_lat_range"),
        CheckConstraint("lon >= -180 AND lon <= 180", name="ck_spot_lon_range"),
        Index("ix_spot_zone", "zone_id"),
    )

    id:      Mapped[str] = mapped_column(String(64), primary_key=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("parking_zones.id", ondelete="CASCADE"), nullable=False)
    lat:     Mapped[float] = mapped_column(Float, nullable=False)
    lon:     Mapped[float] = mapped_column(Float, nullable=False)
    type:    Mapped[SpotType] = mapped_column(String(24), nullable=False)

    zone:    Mapped["ParkingZone"] = relationship(back_populates="spots")
    events:  Mapped[list["SpotEvent"]] = relationship(back_populates="spot", cascade="all, delete-orphan")
    devices: Mapped[list["Device"]]    = relationship(back_populates="spot")

    def __repr__(self) -> str:
        return f"<ParkingSpot id={self.id} zone={self.zone_id} ({self.lat},{self.lon})>"
