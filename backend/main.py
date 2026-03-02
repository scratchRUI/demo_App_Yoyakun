import os
from dotenv import load_dotenv

# プロジェクトルートの .env.local を読み込む
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.local"))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from fastapi import FastAPI, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from schemas import RecordResponse, SOAPSummary
from services import summarize_audio_to_soap
from database import get_db
from models import Record


app = FastAPI(title="看護記録 AIサポートAPI")

@app.get("/")
def read_root():
    return {"message": "バックエンドAPIが正常に動作しています"}

@app.post("/api/records", response_model=RecordResponse)
async def create_record(
    patient_id: int = Form(...),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    print(f"受付: 患者ID {patient_id} のデータを受信しました")

    # 1. 音声を処理してSOAPと全体の文字起こし(raw_text)を取得
    soap_data_dict, raw_text = await summarize_audio_to_soap(audio)

    # 2. 取得したデータをDBに保存
    new_record = Record(
        patient_id=patient_id,
        raw_text=raw_text,
        s_text=soap_data_dict.get("s_text", ""),
        o_text=soap_data_dict.get("o_text", ""),
        a_text=soap_data_dict.get("a_text", ""),
        p_text=soap_data_dict.get("p_text", "")
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    # 3. レスポンス整形
    return RecordResponse(
        message="AIによるSOAP要約が完了しました!",
        original_text=raw_text,
        soap_summary=SOAPSummary(**soap_data_dict),
        patient_id=patient_id,
        id=new_record.id,
        created_at=new_record.created_at
    )