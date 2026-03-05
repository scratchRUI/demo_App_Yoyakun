# Step 4: Alembic マイグレーション

## 前提条件
- Step 1〜3 が完了していること
- PostgreSQL が起動していること（`postgresql://localhost/monshin_demo`）

## 手順

### 1. マイグレーションファイル自動生成
```bash
cd /Users/tsukamotorui/Desktop/medical-demo/backend
source .venv/bin/activate  # 仮想環境が有効でない場合
alembic revision --autogenerate -m "add patients table and foreign key"
```

### 2. 生成されたマイグレーションファイルを確認・修正
`backend/alembic/versions/` に新しいファイルが生成される。

**以下の内容を確認すること：**
- `upgrade()` 内に `patients` テーブルの CREATE TABLE がある
- `records.patient_id` に ForeignKey 制約が追加されている

**`upgrade()` の先頭に以下を追加（既存データ対応）：**
```python
def upgrade() -> None:
    # patients テーブルを先に作成
    op.create_table(
        'patients',
        # ... (自動生成された内容)
    )

    # 既存データ対応: デモ患者を挿入（records テーブルに patient_id=1 のデータがある場合）
    op.execute("INSERT INTO patients (id, name) VALUES (1, 'デモ患者') ON CONFLICT (id) DO NOTHING")

    # FK制約の追加（自動生成された内容）
    # ...
```

**`downgrade()` も確認：**
- FK制約の削除 → patients テーブルの DROP の順序になっていること

### 3. マイグレーション実行
```bash
alembic upgrade head
```

### 4. 確認
```bash
python -c "
from database import SessionLocal
from models import Patient
db = SessionLocal()
p = db.query(Patient).first()
print(f'Patient: id={p.id}, name={p.name}')
db.close()
"
```

## ガードレール
- **マイグレーション実行前に必ずファイル内容を確認すること**（自動生成が正しいとは限らない）
- `patients` テーブル作成が `records` への FK 追加より**先**に実行されることを確認
- 既存の `records` テーブルに `patient_id=1` のデータがある可能性があるため、デモ患者の INSERT は必須
- `ON CONFLICT DO NOTHING` を使って冪等にする
- downgrade が正しい逆順序（FK削除 → テーブルDROP）であることを確認

## 完了チェック
- [ ] `alembic upgrade head` がエラーなく完了
- [ ] `patients` テーブルが存在し、デモ患者（id=1）が入っている
- [ ] `records.patient_id` に FK 制約が設定されている
- [ ] `alembic current` で最新リビジョンが表示される
