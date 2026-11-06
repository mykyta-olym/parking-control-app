# app/routers/parking.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.parking import (
    ParkingListOut,
    ParkingFacilitiesListOut,
    ParkingFacilityOut,
)
from app.services.parking_service import (
    get_parking_snapshot,
    list_parking_facilities,
    get_parking_facility,
)

router = APIRouter(prefix="/api/v1", tags=["Parking"])


@router.get("/parking", response_model=ParkingListOut, summary="Parking snapshot")
def read_parking(db: Session = Depends(get_db)) -> ParkingListOut:
    """Return an aggregated snapshot of all parking zones."""
    return get_parking_snapshot(db)


@router.get(
    "/parkings",
    response_model=ParkingFacilitiesListOut,
    summary="List parking facilities",
)
def read_parking_facilities(
    district: str | None = None,
    only_free: bool = False,
    max_price: float | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
) -> ParkingFacilitiesListOut:
    """Return detailed parking facilities (one per zone) with optional filters."""
    return list_parking_facilities(
        db,
        district=district,
        only_free=only_free,
        max_price=max_price,
        query=q,
    )


@router.get(
    "/parkings/{parking_id}",
    response_model=ParkingFacilityOut,
    summary="Parking facility detail",
)
def read_parking_facility(
    parking_id: str,
    db: Session = Depends(get_db),
) -> ParkingFacilityOut:
    """Return a single parking facility (zone) by its identifier."""
    facility = get_parking_facility(db, parking_id)
    if facility is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parking facility not found.",
        )
    return facility
