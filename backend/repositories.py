from sqlalchemy.orm import Session

from models import Patient, Record


def list_patients(db: Session) -> list[Patient]:
    return db.query(Patient).order_by(Patient.name).all()


def get_patient_by_id(db: Session, patient_id: int) -> Patient | None:
    return db.query(Patient).filter(Patient.id == patient_id).first()


def create_patient(db: Session, name: str) -> Patient:
    patient = Patient(name=name.strip())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def list_records_by_patient_id(db: Session, patient_id: int) -> list[Record]:
    return (
        db.query(Record)
        .filter(Record.patient_id == patient_id)
        .order_by(Record.created_at.desc())
        .all()
    )


def create_record(
    db: Session,
    *,
    patient_id: int,
    raw_text: str,
    soap_summary: dict[str, str],
) -> Record:
    new_record = Record(
        patient_id=patient_id,
        raw_text=raw_text,
        s_text=soap_summary.get("s_text", ""),
        o_text=soap_summary.get("o_text", ""),
        a_text=soap_summary.get("a_text", ""),
        p_text=soap_summary.get("p_text", ""),
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record
