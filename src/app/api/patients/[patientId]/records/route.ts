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
