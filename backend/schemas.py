from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SOAPSummary(BaseModel):
    s_text: str
    o_text: str
    a_text: str
    p_text: str

class RecordResponse(BaseModel):
    message: str
    original_text: Optional[str] = None
    soap_summary: SOAPSummary
    patient_id: int
    id: int
    created_at: datetime

class PatientCreate(BaseModel):
    name: str

class PatientResponse(BaseModel):
    id: int
    name: str
    created_at: datetime