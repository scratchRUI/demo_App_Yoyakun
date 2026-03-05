# Step 7: Frontend — page.tsx の UI 変更（メイン作業）

## 対象ファイル
`src/app/page.tsx`

## 概要
シングルページを2つの画面状態に分割:
- **画面1**: 患者選択（患者一覧 + 新規作成）
- **画面2**: 録音 + 過去記録表示（既存の録音機能 + 過去記録リスト）

---

## 追加する型定義（ファイル上部、既存の SOAPSummary の下に追加）

```typescript
interface Patient {
  id: number;
  name: string;
  created_at: string;
}

interface PastRecord {
  id: number;
  created_at: string;
  s_text: string;
  o_text: string;
  a_text: string;
  p_text: string;
  raw_text: string;
}
```

---

## 追加する State（既存の State の下に追加）

```typescript
// 患者関連
const [patients, setPatients] = useState<Patient[]>([]);
const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
const [newPatientName, setNewPatientName] = useState("");

// 過去記録
const [pastRecords, setPastRecords] = useState<PastRecord[]>([]);
const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);
```

---

## 追加する関数

### 1. 患者一覧取得（ページ読み込み時に呼ぶ）
```typescript
const fetchPatients = async () => {
  try {
    const res = await fetch("/api/patients");
    if (res.ok) {
      const data = await res.json();
      setPatients(data);
    }
  } catch (error) {
    console.error("患者一覧の取得に失敗:", error);
  }
};
```

### 2. 患者作成
```typescript
const createPatient = async () => {
  if (!newPatientName.trim()) return;
  try {
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPatientName.trim() }),
    });
    if (res.ok) {
      setNewPatientName("");
      fetchPatients(); // 一覧を再取得
    }
  } catch (error) {
    console.error("患者の作成に失敗:", error);
  }
};
```

### 3. 患者選択
```typescript
const selectPatient = async (patient: Patient) => {
  setSelectedPatient(patient);
  setSoapSummary(null);
  setRawText("");
  setErrorMessage("");
  // 過去記録を取得
  await fetchPatientRecords(patient.id);
};
```

### 4. 過去記録取得
```typescript
const fetchPatientRecords = async (patientId: number) => {
  try {
    const res = await fetch(`/api/patients/${patientId}/records`);
    if (res.ok) {
      const data = await res.json();
      setPastRecords(data);
    }
  } catch (error) {
    console.error("記録の取得に失敗:", error);
  }
};
```

### 5. 患者選択解除（戻る）
```typescript
const goBack = () => {
  setSelectedPatient(null);
  setPastRecords([]);
  setSoapSummary(null);
  setRawText("");
  setErrorMessage("");
};
```

---

## useEffect の追加

```typescript
import { useState, useRef, useEffect } from "react";

// コンポーネント内に追加
useEffect(() => {
  fetchPatients();
}, []);
```

---

## stopRecording の変更箇所

`stopRecording` 内の `formData.append` 部分に `patient_id` を追加:

**変更前:**
```typescript
const formData = new FormData();
formData.append("audio", audioBlob, "recording.webm");
```

**変更後:**
```typescript
const formData = new FormData();
formData.append("audio", audioBlob, "recording.webm");
formData.append("patient_id", String(selectedPatient!.id));
```

**また、録音成功後に過去記録を再取得:**

`setSoapSummary(data.soap_summary);` の後に追加:
```typescript
// 過去記録リストを更新
fetchPatientRecords(selectedPatient!.id);
```

---

## JSX の変更

### 全体構造
```tsx
return (
  <main className="min-h-screen flex flex-col items-center p-8 gap-6">
    <h1 className="text-3xl font-bold text-gray-800">問診要約くん (SOAP版)</h1>

    {!selectedPatient ? (
      // === 画面1: 患者選択 ===
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* 新規患者作成 */}
        <div className="bg-white shadow rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4">新規患者を追加</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newPatientName}
              onChange={(e) => setNewPatientName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createPatient()}
              placeholder="患者名を入力"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={createPatient}
              disabled={!newPatientName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              追加
            </button>
          </div>
        </div>

        {/* 患者一覧 */}
        <div className="bg-white shadow rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4">患者一覧</h2>
          {patients.length === 0 ? (
            <p className="text-gray-500">患者が登録されていません</p>
          ) : (
            <div className="flex flex-col gap-2">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => selectPatient(patient)}
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition text-left"
                >
                  <div>
                    <span className="font-semibold text-gray-800">{patient.name}</span>
                    <span className="ml-3 text-sm text-gray-500">ID: {patient.id}</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    ) : (
      // === 画面2: 録音 + 過去記録 ===
      <div className="w-full max-w-4xl flex flex-col gap-6">
        {/* ヘッダー: 患者名 + 戻るボタン */}
        <div className="flex items-center gap-4">
          <button
            onClick={goBack}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
          >
            ← 戻る
          </button>
          <h2 className="text-xl font-bold text-gray-800">
            {selectedPatient.name}
            <span className="ml-2 text-sm font-normal text-gray-500">ID: {selectedPatient.id}</span>
          </h2>
        </div>

        {/* 録音ボタン（既存のまま） */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-8 py-4 rounded-full text-white text-xl font-bold hover:shadow-lg transition-all ${
            isRecording ? "bg-red-500 animate-pulse hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isRecording ? "⏹ 録音を終了して解析" : "🎙 問診を録音する"}
        </button>

        {/* ローディング（既存のまま） */}
        {loading && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 font-medium">AIが診察内容を解析・SOAP化しています...</p>
          </div>
        )}

        {/* エラー（既存のまま） */}
        {errorMessage && <p className="text-red-500 font-bold bg-red-100 p-4 rounded-lg">{errorMessage}</p>}

        {/* 現在のSOAP結果（既存のまま） */}
        {soapSummary && (
          /* ... 既存の SOAP 表示コード全体をそのまま配置 ... */
        )}

        {/* === 過去の記録 === */}
        {pastRecords.length > 0 && (
          <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
            <div className="bg-gray-700 text-white px-6 py-3">
              <h3 className="font-bold">過去の問診記録</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {pastRecords.map((record) => (
                <div key={record.id} className="p-4">
                  <button
                    onClick={() =>
                      setExpandedRecordId(
                        expandedRecordId === record.id ? null : record.id
                      )
                    }
                    className="w-full flex items-center justify-between text-left"
                  >
                    <span className="font-medium text-gray-800">
                      {new Date(record.created_at).toLocaleString("ja-JP")}
                    </span>
                    <span className="text-gray-400">
                      {expandedRecordId === record.id ? "▲" : "▼"}
                    </span>
                  </button>
                  {expandedRecordId === record.id && (
                    <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200">
                      <div>
                        <span className="text-sm font-bold text-blue-700">S:</span>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.s_text}</p>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-green-700">O:</span>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.o_text}</p>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-purple-700">A:</span>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.a_text}</p>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-orange-700">P:</span>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.p_text}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </main>
);
```

---

## ガードレール

### 絶対に守ること
- 既存の SOAP 表示コード（`ref={summaryRef}` の div 全体）は変更せずそのまま使う
- 既存の `downloadPDF` 関数は変更しない
- `jsPDF` と `html2canvas` の import は残す
- `summaryRef` は既存のまま維持

### 注意点
- `selectedPatient!.id` を使う箇所（stopRecording 内）は、`selectedPatient` が null でないことが画面2でのみ呼ばれることで保証される
- `useEffect` の `fetchPatients` は依存配列 `[]` で初回のみ実行
- `import` に `useEffect` を追加し忘れないこと
- 患者作成後に `fetchPatients()` で一覧を再取得する（ローカル state に push するのではなく API から再取得で一貫性を保つ）

### やらないこと
- ルーティング（Next.js のページ分割）は行わない。単一ページ内の条件分岐で実装
- 患者の削除・編集機能は今回のスコープ外
- 認証・権限管理は今回のスコープ外

---

## 完了チェック
- [ ] `useEffect` で初回に患者一覧が取得される
- [ ] 新規患者を作成でき、一覧に表示される
- [ ] 患者をクリックすると画面2（録音 + 過去記録）に遷移する
- [ ] 「戻る」ボタンで画面1に戻れる
- [ ] 録音完了後、選択中の `patient_id` がバックエンドに送信される
- [ ] 録音完了後、過去記録リストが自動更新される
- [ ] 過去記録をクリックすると展開/折りたたみできる
- [ ] 既存の SOAP 表示と PDF 出力が正常に動作する
- [ ] TypeScript エラーがないこと（`npx tsc --noEmit`）
