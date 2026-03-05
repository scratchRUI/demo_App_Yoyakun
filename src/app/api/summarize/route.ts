import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    try {
        // 1. フロントからFormDataを受け取る
        const formData = await req.formData();
        
        // patient_id がフロントエンドから送信されていることを確認
        if (!formData.has("patient_id")) {
            return NextResponse.json(
                { error: "patient_id が指定されていません" },
                { status: 400 }
            );
        }
        
        // 2. FastAPI バックエンドへプロキシする
        console.log("Sending data to FastAPI backend...");
        const response = await fetch("http://localhost:8000/api/records", {
            method: "POST",
            body: formData,
            // fetch() を使って FormData を送ることにより
            // Content-Type は boundary 付きの multipart/form-data に自動設定されます。
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("FastAPI Error:", response.status, errorText);
            return NextResponse.json({ error: "バックエンド処理中にエラーが発生しました" }, { status: response.status });
        }

        const data = await response.json();
        
        // 3. FastAPIからのレスポンスをそのまま返す
        return NextResponse.json(data);

    } catch (error) {
        console.error("APIエラー:", error);
        return NextResponse.json({ error: "中継処理中にエラーが発生しました" }, { status: 500 });
    }
}

