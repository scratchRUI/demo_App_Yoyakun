# 患者ID別入力 & 日付別履歴表示 — 実装ガイド

## 概要
患者を選択/作成してから問診を録音し、過去の記録を日付別に閲覧できるようにする。

## 実装順序（必ずこの順番で進めること）

1. **step1-backend-models.md** — DB モデル変更（Patient追加、Record FK追加）
2. **step2-backend-schemas.md** — Pydantic スキーマ追加
3. **step3-backend-endpoints.md** — FastAPI エンドポイント追加（3つ）
4. **step4-alembic-migration.md** — Alembic マイグレーション実行
5. **step5-frontend-proxy-routes.md** — Next.js API プロキシルート追加
6. **step6-frontend-summarize-fix.md** — summarize ルートの patient_id 修正
7. **step7-frontend-ui.md** — page.tsx の UI 変更（メイン作業）

## ガードレール（全ステップ共通）

- 各ステップ完了後、必ず構文チェック（Python: `python -c "import models"` / TS: `npx tsc --noEmit`）を行うこと
- 既存のコードを削除する場合は、代替コードが動作確認済みであること
- 新規ファイル作成時は、既存ファイルのパターン（import方式、エラーハンドリング）を踏襲すること
- patient_id のハードコード "1" は Step 6 まで残しておき、Step 6 で削除する
- 各ステップのファイル内に「完了チェック」項目があるので、全項目クリアしてから次へ進むこと
