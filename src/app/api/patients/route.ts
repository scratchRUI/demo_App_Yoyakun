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
