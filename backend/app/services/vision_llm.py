import base64
import json
import urllib.error
import urllib.request

from app.core.config import get_settings


def caption_image(*, image_png_bytes: bytes, mime_type: str) -> tuple[str, str, str]:
    """
    Returns (caption, provider, model).
    Tries Qwen2.5-VL first (if configured), falls back to Gemini.
    """
    settings = get_settings()
    system = (
        "You are a radiology education assistant. Produce a concise chest X-ray style caption. "
        "Be careful: if modality is not clearly a CXR, say so. "
        "Output only the caption text."
    )
    user_text = "Caption this medical image for a radiology student."
    try:
        return _generate_multimodal_with_fallback(
            system_instruction=system,
            user_text=user_text,
            image_png_bytes=image_png_bytes,
            image_mime=mime_type or "image/png",
        )
    except Exception:
        # Final fallback to keep the UI functional even if providers are down.
        return (
            "Radiology image uploaded. AI caption is temporarily unavailable.",
            "fallback",
            "proxy",
        )


def vqa_image(
    *,
    question: str,
    image_png_bytes: bytes,
    mime_type: str,
) -> tuple[str, str, str]:
    settings = get_settings()
    system = (
        "You are MedVision AI, a radiology tutor specializing in chest X-rays. "
        "Answer educationally with key signs and differentials. "
        "Do not provide definitive diagnosis for a real patient; suggest clinical correlation."
    )
    user_text = question.strip()
    try:
        return _generate_multimodal_with_fallback(
            system_instruction=system,
            user_text=user_text,
            image_png_bytes=image_png_bytes,
            image_mime=mime_type or "image/png",
        )
    except Exception:
        return (
            "AI visual analysis is temporarily unavailable. "
            "Please try again in a moment or switch to RAG mode.",
            "fallback",
            "proxy",
        )


def _generate_multimodal_with_fallback(
    *,
    system_instruction: str,
    user_text: str,
    image_png_bytes: bytes,
    image_mime: str,
) -> tuple[str, str, str]:
    settings = get_settings()
    preferred = (settings.vision_provider or "qwen").lower()

    if preferred == "qwen":
        try:
            text, model = _qwen_generate_multimodal(
                base_url=settings.vision_qwen_base_url,
                api_key=settings.vision_qwen_api_key,
                model=settings.vision_qwen_model,
                system_instruction=system_instruction,
                user_text=user_text,
                image_png_bytes=image_png_bytes,
            )
            return text, "qwen", model
        except Exception:
            # Fall through to Gemini
            pass

    api_key = settings.vision_gemini_api_key or settings.assistant_gemini_api_key
    if not api_key:
        raise ValueError("VISION_GEMINI_API_KEY is not configured (and Qwen was unavailable).")

    text = _gemini_generate_multimodal(
        api_key=api_key,
        model=settings.vision_gemini_model,
        system_instruction=system_instruction,
        user_text=user_text,
        image_bytes=image_png_bytes,
        image_mime=image_mime,
    )
    return text, "gemini", settings.vision_gemini_model


def _gemini_generate_multimodal(
    *,
    api_key: str,
    model: str,
    system_instruction: str,
    user_text: str,
    image_bytes: bytes,
    image_mime: str,
) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    payload = {
        "systemInstruction": {
            "role": "system",
            "parts": [{"text": system_instruction}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": user_text},
                    {
                        "inline_data": {
                            "mime_type": image_mime,
                            "data": base64.b64encode(image_bytes).decode("ascii"),
                        }
                    },
                ],
            }
        ],
        "generationConfig": {"temperature": 0.3},
    }

    req = urllib.request.Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    candidates = raw.get("candidates") or []
    content = (candidates[0].get("content") if candidates else None) or {}
    parts = content.get("parts") or []
    text = (parts[0].get("text") if parts else None) or ""
    return text.strip() or "I couldn't generate a response."


def _qwen_generate_multimodal(
    *,
    base_url: str | None,
    api_key: str | None,
    model: str,
    system_instruction: str,
    user_text: str,
    image_png_bytes: bytes,
) -> tuple[str, str]:
    """
    Qwen2.5-VL via an OpenAI-compatible endpoint (vLLM/etc).
    Expects: POST {base_url}/chat/completions
    """
    if not base_url:
        raise ValueError("VISION_QWEN_BASE_URL is not configured.")

    base = base_url.rstrip("/")
    url = f"{base}/chat/completions"
    data_url = "data:image/png;base64," + base64.b64encode(image_png_bytes).decode("ascii")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_instruction},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_text},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
        "temperature": 0.3,
    }
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    req = urllib.request.Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    choices = raw.get("choices") or []
    message = (choices[0].get("message") if choices else None) or {}
    content = message.get("content") or ""
    return (str(content).strip() or "I couldn't generate a response."), model
