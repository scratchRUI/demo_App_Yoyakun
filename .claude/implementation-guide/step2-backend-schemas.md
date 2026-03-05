# Step 2: Backend — Pydantic スキーマ追加

## 対象ファイル
`backend/schemas.py`

## 現在の内容
```python
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
```

## 変更内容

### ファイル末尾に以下を追加
```python
class PatientCreate(BaseModel):
    name: str

class PatientResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
```

## ガードレール
- 既存の `SOAPSummary` と `RecordResponse` は一切変更しないこと
- `PatientCreate` は name フィールドのみ（id や created_at はサーバー側で自動生成）

## 完了チェック
- [ ] `cd backend && python -c "from schemas import PatientCreate, PatientResponse; print('OK')"` が成功する
- [ ] 既存の `SOAPSummary`, `RecordResponse` が変更されていないこと
