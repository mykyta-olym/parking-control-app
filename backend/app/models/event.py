# app/models/event.py
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, ForeignKey, DateTime, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.types import SpotStatus

class SpotEvent(Base):
    __tablename__ = "spot_events"
    __table_args__ = (
        Index("ix_event_spot_ts", "spot_id", "ts"),
        CheckConstraint("confidence >= 0.0 AND confidence <= 1.0", name="ck_event_conf_range"),
    )

    id:       Mapped[str]   = mapped_column(String(64), primary_key=True)  # UUID/ULID
    spot_id:  Mapped[str]   = mapped_column(ForeignKey("parking_spots.id", ondelete="CASCADE"), nullable=False)
    source:   Mapped[str]   = mapped_column(String(64), nullable=False)  # device_id / provider
    status:   Mapped[SpotStatus] = mapped_column(String(16), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    ts:       Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    spot: Mapped["ParkingSpot"] = relationship(back_populates="events")

    def __repr__(self) -> str:
        return f"<SpotEvent id={self.id} spot={self.spot_id} {self.status} @{self.ts}>"
