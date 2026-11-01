from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.enums import RecordStatus
from app.db.session import get_db
from app.schemas.appointments import AppointmentCreate, AppointmentRead
from app.services import appointment_service

router = APIRouter(prefix="/api/v1/appointments", tags=["appointments"])


@router.post("", response_model=AppointmentRead, status_code=201)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    return appointment_service.create_appointment(db, payload)


@router.get("", response_model=list[AppointmentRead])
def list_appointments(
    status_filter: RecordStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return appointment_service.list_appointments(db, status=status_filter, limit=limit)


@router.get("/{appointment_id}", response_model=AppointmentRead)
def get_appointment(appointment_id: UUID, db: Session = Depends(get_db)):
    return appointment_service.get_appointment(db, str(appointment_id))


@router.post("/{appointment_id}/cancel", response_model=AppointmentRead)
def cancel_appointment(appointment_id: UUID, db: Session = Depends(get_db)):
    return appointment_service.cancel_appointment(db, str(appointment_id))
