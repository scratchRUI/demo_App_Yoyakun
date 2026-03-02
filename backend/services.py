import os
import tempfile
import json
from google import genai
from google.genai import types
from fastapi import UploadFile

def get_genai_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in environment variables.")
    # Initialize the new SDK client
    client = genai.Client(api_key=api_key)
    return client

async def summarize_audio_to_soap(audio_file: UploadFile) -> tuple[dict, str]:
    print("🤖 AIに音声の要約を依頼中 (Using google-genai SDK)...")
    client = get_genai_client()
    
    # 1. 音声ファイルを一時ファイルとして保存し、Gemini API にアップロード
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        content = await audio_file.read()
        temp_audio.write(content)
        temp_audio_path = temp_audio.name

    try:
        print(f"Uploading audio file {temp_audio_path}...")
        # Uploading file with new SDK syntax
        uploaded_file = client.files.upload(
            file=temp_audio_path,
            config=types.UploadFileConfig(mime_type=audio_file.content_type)
        )
        print(f"Upload complete. File URI: {uploaded_file.uri}. Generating content...")
        
        # 2. 生成リクエスト
        prompt = (
            "この音声記録をSOAP形式に要約してください。"
            "また、音声内で話されていた全体の文字起こし（raw_text）も取得したいです。"
            "以下のJSONスキーマに従って出力してください:\n"
            "{\n"
            "  \"raw_text\": \"音声の全体的な文字起こし\",\n"
            "  \"soap\": {\n"
            "    \"s_text\": \"...\",\n"
            "    \"o_text\": \"...\",\n"
            "    \"a_text\": \"...\",\n"
            "    \"p_text\": \"...\"\n"
            "  }\n"
            "}"
        )
        
        system_instruction = (
            "あなたは優秀な医療秘書です。"
            "提供された音声データ（またはテキスト）から診察内容を抽出し、"
            "必ず以下のJSON形式のSOAPフォーマットで返してください。\n"
            "{\n"
            "  \"s_text\": \"患者の主観的訴え\",\n"
            "  \"o_text\": \"客観的所見（検査結果、医師の観察など）\",\n"
            "  \"a_text\": \"評価・アセスメント\",\n"
            "  \"p_text\": \"今後の計画・処方・指示など\"\n"
            "}\n"
            "マークダウンの```json等の装飾はせず、純粋なJSON文字列のみを出力してください。"
        )

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[uploaded_file, prompt],
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2, # keep it deterministic for json outputs
            )
        )
        
        result_text = response.text.strip()
        
        # 余分なマークダウン記法(```json ... ```)を取り除く処理
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
            
        print(f"Gemini Response: {result_text}")
            
        try:
            parsed = json.loads(result_text)
            soap_result = parsed.get("soap", {})
            raw_text_result = parsed.get("raw_text", "文字起こしを取得できませんでした")
            
            # 必要なフィールドが揃っているか確認し、無ければ空文字を埋める
            for key in ["s_text", "o_text", "a_text", "p_text"]:
                if key not in soap_result:
                    soap_result[key] = ""
                    
            return soap_result, raw_text_result
        except json.JSONDecodeError:
            print(f"Failed to parse JSON. Raw response: {result_text}")
            # JSONパース失敗時のフォールバック
            return {
                "s_text": "AIがJSON形式で解析できませんでした",
                "o_text": "",
                "a_text": "エラー発生",
                "p_text": result_text[:500]
            }, "JSONパースエラー"
            
    finally:
        # 一時ファイルの削除とアップロードしたファイルのクリーンアップ
        os.unlink(temp_audio_path)
        try:
            client.files.delete(name=uploaded_file.name)
        except Exception as e:
            print(f"Failed to delete file from Gemini API: {e}")