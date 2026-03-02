from fastapi import FastAPI
from schemas import RecordCreateRequest
from services import summarize_to_soap

app = FastAPI(title="看護記録 AIサポートAPI")

@app.get("/")
def read_root():
    return {"message": "バックエンドAPIが正常に動作しています"}

@app.post("/api/records")
def create_record(record: RecordCreateRequest):
    print(f"受付: 患者ID {record.patient_id} のデータを受信しました")

    soap_data = summarize_to_soap(record.raw_text)

    return {
        "message": "AIによるSOAP要約が完了しました!",
        "original_text": record.raw_text,
        "soap_summary": soap_data  # ★要約結果をフロントエンドに返す
    }
    