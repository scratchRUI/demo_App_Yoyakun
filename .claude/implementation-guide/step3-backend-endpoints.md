# Step 3: Backend — FastAPI エンドポイント追加

## 対象ファイル
`backend/main.py`

## 現在の内容
```python
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.local"))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from fastapi import FastAPI, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from schemas import RecordResponse, SOAPSummary
from services import summarize_audio_to_soap
from database import get_db
from models import Record

app = FastAPI(title="看護記録 AIサポートAPI")

# ... 既存エンドポイント ...
```

## 変更内容

### 1. import 追加
既存の import 行を修正：
```python
from schemas import RecordResponse, SOAPSummary, PatientCreate, PatientResponse
from models import Record, Patient
```

### 2. 追加する CORS 設定
既存の `app = FastAPI(...)` の直後に追加：
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```
（注: 既に CORS 設定がある場合はスキップ）

### 3. 追加するエンドポイント（既存の `@app.post("/api/records")` の**前**に配置）

```python
# --- 患者管理 API ---

@app.get("/api/patients")
def list_patients(db: Session = Depends(get_db)):
    """患者一覧を取得"""
    patients = db.query(Patient).order_by(Patient.name).all()
    return [
        {"id": p.id, "name": p.name, "created_at": p.created_at.isoformat()}
        for p in patients
    ]

@app.post("/api/patients")
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
    """新規患者を作成"""
    patient = Patient(name=payload.name)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return {"id": patient.id, "name": patient.name, "created_at": patient.created_at.isoformat()}

@app.get("/api/patients/{patient_id}/records")
def get_patient_records(patient_id: int, db: Session = Depends(get_db)):
    """患者の過去記録を日付降順で取得"""
    records = (
        db.query(Record)
        .filter(Record.patient_id == patient_id)
        .order_by(Record.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat(),
            "s_text": r.s_text,
            "o_text": r.o_text,
            "a_text": r.a_text,
            "p_text": r.p_text,
            "raw_text": r.raw_text,
        }
        for r in records
    ]
```

## ガードレール
- 既存の `@app.get("/")` と `@app.post("/api/records")` は一切変更しないこと
- 新しいエンドポイントは `/api/patients` プレフィックスに統一
- `list_patients` は `order_by(Patient.name)` で名前順ソート
- `get_patient_records` は `order_by(Record.created_at.desc())` で新しい順
- `created_at` は `.isoformat()` で文字列化してからJSON返却（datetime直接返却はシリアライズエラーの原因）

## 完了チェック
- [ ] `cd backend && python -c "from main import app; print('OK')"` が成功する
- [ ] import 文に `PatientCreate`, `Patient` が含まれている
- [ ] 3つの新エンドポイント（GET /api/patients, POST /api/patients, GET /api/patients/{patient_id}/records）が追加されている
- [ ] 既存の2エンドポイント（GET /, POST /api/records）が変更されていない
