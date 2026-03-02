from pydantic import BaseModel

class RecordCreateRequest(BaseModel):
    patient_id: int
    raw_text: str 