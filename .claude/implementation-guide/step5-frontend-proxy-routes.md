# Step 5: Frontend — プロキシルート追加

## 参考: 既存のプロキシパターン
`src/app/api/summarize/route.ts` のパターンを踏襲する。

## 新規ファイル 1: `src/app/api/patients/route.ts`

### ディレクトリ作成
`src/app/api/patients/` ディレクトリを作成

### ファイル内容
```typescript
import { NextResponse, NextRequest } from "next/server";

const BACKEND_URL = "http://localhost:8000";

// 患者一覧取得
export async function GET() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/patients`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("FastAPI Error:", response.status, errorText);
            return NextResponse.json(
                { error: "患者一覧の取得に失敗しました" },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("APIエラー:", error);
        return NextResponse.json(
            { error: "バックエンドとの通信に失敗しました" },
            { status: 500 }
        );
    }
}

// 患者作成
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const response = await fetch(`${BACKEND_URL}/api/patients`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("FastAPI Error:", response.status, errorText);
            return NextResponse.json(
                { error: "患者の作成に失敗しました" },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("APIエラー:", error);
        return NextResponse.json(
            { error: "バックエンドとの通信に失敗しました" },
            { status: 500 }
        );
    }
}
```

---

## 新規ファイル 2: `src/app/api/patients/[patientId]/records/route.ts`

### ディレクトリ作成
`src/app/api/patients/[patientId]/records/` ディレクトリを作成

### ファイル内容
```typescript
import { NextResponse } from "next/server";

const BACKEND_URL = "http://localhost:8000";

// 患者の過去記録を取得
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ patientId: string }> }
) {
    try {
        const { patientId } = await params;
        const response = await fetch(
            `${BACKEND_URL}/api/patients/${patientId}/records`
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("FastAPI Error:", response.status, errorText);
            return NextResponse.json(
                { error: "記録の取得に失敗しました" },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("APIエラー:", error);
        return NextResponse.json(
            { error: "バックエンドとの通信に失敗しました" },
            { status: 500 }
        );
    }
}
```

## ガードレール
- `BACKEND_URL` は `http://localhost:8000` 固定（既存の summarize/route.ts と同じ）
- Next.js 16 では動的ルートの params は `Promise` 型なので `await params` が必要
- エラーハンドリングは既存の `summarize/route.ts` のパターンを踏襲
- POST では `Content-Type: application/json` ヘッダーを明示的に設定（FormData ではなく JSON を送信）
- GET ではキャッシュに注意: Next.js のデフォルトキャッシュが効く可能性がある。問題があれば `{ cache: "no-store" }` を fetch に追加

## 完了チェック
- [ ] `src/app/api/patients/route.ts` が存在する
- [ ] `src/app/api/patients/[patientId]/records/route.ts` が存在する
- [ ] TypeScript の構文エラーがないこと（`npx tsc --noEmit` で確認）
- [ ] 既存の `src/app/api/summarize/route.ts` は変更されていないこと（Step 6 で変更）
