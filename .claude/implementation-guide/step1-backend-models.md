# Step 1: Backend — DB モデル変更

## 対象ファイル
`backend/models.py`

## 現在の内容
```python
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
```

## 変更内容

### 1. import 追加
- `ForeignKey` を sqlalchemy から追加
- `relationship` を `sqlalchemy.orm` から追加

### 2. Patient モデルを追加（Record クラスの**上**に定義）
```python
class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    records = relationship("Record", back_populates="patient")
```

### 3. Record モデルの変更
- `patient_id` の定義を `Column(Integer, ForeignKey("patients.id"), index=True)` に変更
- `patient = relationship("Patient", back_populates="records")` を追加

## 変更後の完全なファイル内容
```python
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    records = relationship("Record", back_populates="patient")

class Record(Base):
    __tablename__ = "records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    raw_text = Column(Text)
    s_text = Column(Text)
    o_text = Column(Text)
    a_text = Column(Text)
    p_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="records")
```

## ガードレール
- `datetime` の import は不要になるので削除してよい（`func.now()` を使っているため）
- Patient モデルは Record の**前**に定義すること（FK参照の解決順序）
- `back_populates` の値は双方で一致させること（"records" と "patient"）

## 完了チェック
- [ ] `cd backend && python -c "from models import Patient, Record; print('OK')"` が成功する
- [ ] Patient モデルに id, name, created_at, records がある
- [ ] Record モデルに patient_id (ForeignKey付き) と patient (relationship) がある
- [ ] 不要な import `from datetime import datetime` が削除されている
