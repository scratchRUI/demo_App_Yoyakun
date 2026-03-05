import json
import logging
import os
import tempfile
from typing import Any

from fastapi import UploadFile
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)
SOAP_KEYS = ("s_text", "o_text", "a_text", "p_text")


def get_genai_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in environment variables.")

    return genai.Client(api_key=api_key)


def _strip_markdown_code_fence(text: str) -> str:
    result = text.strip()
    if result.startswith("```"):
        lines = result.splitlines()
        if lines:
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        result = "\n".join(lines).strip()
    return result


def _normalize_soap_payload(payload: dict[str, Any]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for key in SOAP_KEYS:
        value = payload.get(key, "")
        normalized[key] = value if isinstance(value, str) else str(value)
    return normalized


async def summarize_audio_to_soap(audio_file: UploadFile) -> tuple[dict[str, str], str]:
    logger.info("starting summarization request via google-genai")

    client = get_genai_client()
    temp_audio_path: str | None = None
    uploaded_file_name: str | None = None

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        content = await audio_file.read()
        temp_audio.write(content)
        temp_audio_path = temp_audio.name

    try:
        mime_type = audio_file.content_type or "audio/webm"
        uploaded_file = client.files.upload(
            file=temp_audio_path,
            config=types.UploadFileConfig(mime_type=mime_type),
        )
        uploaded_file_name = uploaded_file.name

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
            model="gemini-2.5-flash",
            contents=[uploaded_file, prompt],
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
            ),
        )

        result_text = _strip_markdown_code_fence(response.text or "")

        try:
            parsed = json.loads(result_text)
        except json.JSONDecodeError:
            logger.exception("failed to parse response json")
            return (
                {
                    "s_text": "AIがJSON形式で解析できませんでした",
                    "o_text": "",
                    "a_text": "エラー発生",
                    "p_text": result_text[:500],
                },
                "JSONパースエラー",
            )

        soap_result = _normalize_soap_payload(parsed.get("soap", {}))
        raw_text_result = parsed.get("raw_text", "文字起こしを取得できませんでした")
        if not isinstance(raw_text_result, str):
            raw_text_result = str(raw_text_result)

        return soap_result, raw_text_result
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.unlink(temp_audio_path)
            except OSError:
                logger.exception("failed to remove temporary audio file")

        if uploaded_file_name:
            try:
                client.files.delete(name=uploaded_file_name)
            except Exception:
                logger.exception("failed to delete uploaded file from gemini")
