# Step 6: Frontend — summarize ルートの patient_id 修正

## 対象ファイル
`src/app/api/summarize/route.ts`

## 変更内容
`patient_id` のハードコード（"1"固定）を削除し、フロントエンドから送られた値をそのまま転送する。

## 現在のコード（該当部分）
```typescript
// デモ用としてpatient_id を固定で付与する (実際のアプリではログインユーザーや選択患者等から取得)
if (!formData.has("patient_id")) {
    formData.append("patient_id", "1");
}
```

## 変更後のコード（該当部分）
```typescript
// patient_id がフロントエンドから送信されていることを確認
if (!formData.has("patient_id")) {
    return NextResponse.json(
        { error: "patient_id が指定されていません" },
        { status: 400 }
    );
}
```

## ガードレール
- この変更は **Step 7（page.tsx の UI 変更）と同時またはその前** に行うこと
- Step 7 で page.tsx が `patient_id` を FormData に含めるようになるまで、録音機能は `patient_id` 未指定で 400 エラーになる
- 変更するのは上記の if ブロックのみ。ファイルの他の部分は変更しないこと

## 完了チェック
- [ ] `formData.append("patient_id", "1")` のハードコードが削除されている
- [ ] `patient_id` 未指定時に 400 エラーを返すバリデーションが追加されている
- [ ] ファイルの他の部分（fetch 呼び出し、エラーハンドリング）が変更されていないこと
