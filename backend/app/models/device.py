# app/models/device.py
from typing import Optional
from sqlalchemy import String, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.types import DeviceKind, DeviceStatus

class Device(Base):
    __tablename__ = "devices"
    __table_args__ = (
        Index("ix_device_zone", "zone_id"),
        Index("ix_device_spot", "spot_id"),
    )

    id:      Mapped[str] = mapped_column(String(64), primary_key=True)
    kind:    Mapped[DeviceKind] = mapped_column(String(24), nullable=False)
    status:  Mapped[DeviceStatus] = mapped_column(String(16), nullable=False, default=DeviceStatus.online)
    zone_id: Mapped[str] = mapped_column(ForeignKey("parking_zones.id", ondelete="CASCADE"), nullable=False)
    spot_id: Mapped[Optional[str]] = mapped_column(ForeignKey("parking_spots.id", ondelete="SET NULL"), nullable=True)

    zone: Mapped["ParkingZone"] = relationship(back_populates="devices")
    spot: Mapped[Optional["ParkingSpot"]] = relationship(back_populates="devices")

    def __repr__(self) -> str:
        return f"<Device id={self.id} kind={self.kind} zone={self.zone_id} spot={self.spot_id}>"
