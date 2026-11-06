# app/models/snapshot.py
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ZoneSnapshot(Base):
    __tablename__ = "zone_snapshots"
    __table_args__ = (
        Index("ix_snapshot_zone_ts", "zone_id", "ts"),
        Index("ix_snapshot_district_ts", "district", "ts"),
        CheckConstraint("total_spots >= 0", name="ck_snapshot_total_nonneg"),
        CheckConstraint("occupied_spots >= 0", name="ck_snapshot_occupied_nonneg"),
        CheckConstraint("occupied_spots <= total_spots", name="ck_snapshot_occupied_le_total"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("parking_zones.id", ondelete="CASCADE"), nullable=False)
    district: Mapped[str] = mapped_column(String(24), nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    total_spots: Mapped[int] = mapped_column(Integer, nullable=False)
    occupied_spots: Mapped[int] = mapped_column(Integer, nullable=False)
    price_per_hour: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_open: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    zone: Mapped["ParkingZone"] = relationship("ParkingZone", backref="snapshots")

    def __repr__(self) -> str:
        return f"<ZoneSnapshot zone={self.zone_id} ts={self.ts} occ={self.occupied_spots}/{self.total_spots}>"
