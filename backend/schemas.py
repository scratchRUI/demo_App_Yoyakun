from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

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
    name: str = Field(min_length=1, max_length=100)

class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime


class PastRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    s_text: str
    o_text: str
    a_text: str
    p_text: str
    raw_text: str
