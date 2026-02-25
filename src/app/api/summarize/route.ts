import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse, NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
console.log("API KEY loaded:", process.env.GEMINI_API_KEY ? "YES" : "NO");
export async function POST(req: NextRequest) {
    try {
        // 1. フロントから音声ファイルを受け取る
        const formData = await req.formData();
        const audioFile = formData.get("audio") as File;
        
        if (!audioFile) {
            return NextResponse.json({ error: "音声ファイルがありません" }, { status: 400 });
        }
        // 2. 音声ファイルをbase64に変換 
        const arrayBuffer = await audioFile.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString("base64");
        
        // 3. Gemini APIに音声 + 要約プロンプトを送信
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: audioFile.type,
                    data: base64Audio
                },
            },
            { text: "この音声の内容を簡潔に要約してください。箇条書きで要点をまとめてください"},
        ]);

        // 4. 要約テキストを返す
        const summary = result.response.text();
        return NextResponse.json({ summary });

    } catch (error) {
        console.error("APIエラー:", error);
        return NextResponse.json({ error: "要約中にエラーが発生しました" }, { status: 500 });
    }
}

