# Step 3: FastAPI (バックエンド) の受け口と保存処理を作る

このステップでは、Next.js（フロントエンド）から送られてくる「音声ファイル」を受け取り、Geminiに投げて（Step 2で作った機能）、結果を「PostgreSQL データベース」に保存するまでの流れを作ります。

ここでの主役は `backend/schemas.py` と `backend/main.py` の2つのファイルです。

---

## 1. `schemas.py` の役割と変更点

`schemas.py` は、**「APIがどんなデータを返すか（レスポンスの型）」** や **「どんなデータを受け取るか（リクエストの型）」** を定義するファイルです。これには **Pydantic (パイダンティック)** というライブラリを使います。

### これまでのコード

これまでは「テキスト (`raw_text`)」を受け取るための型 `RecordCreateRequest` しか定義されていませんでした。

```python
class RecordCreateRequest(BaseModel):
    patient_id: int
    raw_text: str
```

### これからのコード

今回はフロントエンドから「音声ファイル（FormData）」を受け取ります。ファイルの受け取りには Pydantic モデルではなく FastAPI が用意している `UploadFile` を使うため、入力用のスキーマはもう不要になります。

代わりに、「処理が終わった後にフロントエンドへ返すデータ」の形を定義します。Geminiからは SOAP形式でデータが返ってくるため、その構造を定義します。

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# Geminiが返すSOAPデータの構造を定義
class SOAPSummary(BaseModel):
    s_text: str
    o_text: str
    a_text: str
    p_text: str

# APIが最終的にフロントエンドに返す情報の全体像
class RecordResponse(BaseModel):
    message: str                  # 成功メッセージなど
    original_text: Optional[str] = None # 音声の全文文字起こし
    soap_summary: SOAPSummary     # 上で定義したSOAPデータ
    patient_id: int               # 誰のデータか
    id: int                       # データベースに保存された時のID (主キー)
    created_at: datetime          # 保存日時
```

これをしておくことで、FastAPIが自動的に「この型の通りにデータが揃っているか」をチェックしてくれますし、Swagger UI (ドキュメント) にも綺麗に表示されます。

---

## 2. `main.py` の役割と変更点

`main.py` は、言わば「お店の受付」です。外部からのリクエスト（今回は `/api/records` 宛への音声送信）を受け取り、裏方（`services.py` や データベース）に指示を出します。

### 変更のポイント

1. **`UploadFile` と `Form` で受け取る**
   音声ファイルを受け取る場合、JSONではなく「マルチパートフォームデータ（multipart/form-data）」という形式になります。
   そのため、パスオペレーション関数（APIの処理を書く関数）の引数を以下のように変えます。

   ```python
   async def create_record(
       patient_id: int = Form(...),    # フォームデータとしてIDを受け取る
       audio: UploadFile = File(...)   # フォームデータとしてファイルを受け取る
   )
   ```

2. **Step 2の関数 (`summarize_audio_to_soap`) を呼ぶ**
   `await summarize_audio_to_soap(audio)` で、受け取った音声をGeminiに投げ、`[SOAPの辞書データ, 全文の文字列]` という2つの結果を受け取ります。

3. **データベースに保存する**
   `models.py` で定義されている `Record` クラスの形に合わせてデータを作り、データベース(`db`) に保存します。
   ```python
   new_record = Record(
       patient_id=patient_id,
       raw_text=raw_text,                 # Geminiが作った全文
       s_text=soap_data_dict.get("s_text", ""), # Geminiが作ったS
       # ... O, A, P も同様に設定
   )
   db.add(new_record) # DBへの追加を予約
   db.commit()        # 実際にセーブする
   db.refresh(new_record) # 保存されて割り振られたIDなどをインスタンスに反映
   ```

これで、「Next.jsからの音声受け取り」→「GeminiでSOAP化＆文字起こし」→「データベース保存」の一連のバックエンド処理が完成します！
