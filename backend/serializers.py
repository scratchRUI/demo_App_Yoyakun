from models import Record
from schemas import RecordResponse, SOAPSummary


def build_record_response(record: Record) -> RecordResponse:
    return RecordResponse(
        message="AIによるSOAP要約が完了しました!",
        original_text=record.raw_text,
        soap_summary=SOAPSummary(
            s_text=record.s_text or "",
            o_text=record.o_text or "",
            a_text=record.a_text or "",
            p_text=record.p_text or "",
        ),
        patient_id=record.patient_id,
        id=record.id,
        created_at=record.created_at,
    )
