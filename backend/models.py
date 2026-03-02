from sqlalchemy import Column, Integer, String, Text, DateTime, func
from datetime import datetime
from database import Base

class Record(Base):
    __tablename__ = "records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True)
    raw_text = Column(Text)
    s_text = Column(Text)
    o_text = Column(Text)
    a_text = Column(Text)
    p_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())