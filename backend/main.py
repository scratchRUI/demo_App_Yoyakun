import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db
from repositories import (
    create_patient as create_patient_in_db,
    create_record as create_record_in_db,
    get_patient_by_id,
    list_patients as list_patients_from_db,
    list_records_by_patient_id,
)
from schemas import PastRecordResponse, PatientCreate, PatientResponse, RecordResponse
from serializers import build_record_response
from services import summarize_audio_to_soap

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env.local")
load_dotenv(BASE_DIR / ".env")

logger = logging.getLogger(__name__)

app = FastAPI(title="看護記録 AIサポートAPI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "バックエンドAPIが正常に動作しています"}


@app.get("/api/patients", response_model=list[PatientResponse])
def list_patients(db: Session = Depends(get_db)) -> list[PatientResponse]:
    return list_patients_from_db(db)


@app.post(
    "/api/patients",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)) -> PatientResponse:
    patient_name = payload.name.strip()
    if not patient_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="患者名を入力してください",
        )

    return create_patient_in_db(db, patient_name)


@app.get(
    "/api/patients/{patient_id}/records",
    response_model=list[PastRecordResponse],
)
def get_patient_records(patient_id: int, db: Session = Depends(get_db)) -> list[PastRecordResponse]:
    patient = get_patient_by_id(db, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="患者が見つかりません",
        )

    records = list_records_by_patient_id(db, patient_id)
    return [
        PastRecordResponse(
            id=record.id,
            created_at=record.created_at,
            s_text=record.s_text or "",
            o_text=record.o_text or "",
            a_text=record.a_text or "",
            p_text=record.p_text or "",
            raw_text=record.raw_text or "",
        )
        for record in records
    ]


@app.post("/api/records", response_model=RecordResponse)
async def create_record(
    patient_id: int = Form(...),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> RecordResponse:
    patient = get_patient_by_id(db, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="患者が見つかりません",
        )

    logger.info("audio record received for patient_id=%s", patient_id)

    soap_data, raw_text = await summarize_audio_to_soap(audio)
    new_record = create_record_in_db(
        db,
        patient_id=patient_id,
        raw_text=raw_text,
        soap_summary=soap_data,
    )

    return build_record_response(new_record)
