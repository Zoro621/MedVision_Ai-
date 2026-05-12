"""
Vision-LLM service.

This is now a thin facade over `app.services.local_vlm`, which talks to
Qwen2.5-VL (or any other multimodal Ollama model). The previous Gemini and
Qwen-via-HTTP cloud paths are preserved as commented `# region disabled-...`
blocks at the bottom of this file for reference / re-enablement.

Public surface (unchanged for callers in `routes/vision.py`,
`services/lime_explainer.py`, etc.):
    caption_image(image_png_bytes, mime_type) -> (caption, provider, model)
    vqa_image(question, image_png_bytes, mime_type) -> (answer, provider, model)
"""
from __future__ import annotations

import logging

from app.core.config import get_settings
from app.services import local_vlm

logger = logging.getLogger(__name__)


def caption_image(*, image_png_bytes: bytes, mime_type: str) -> tuple[str, str, str]:
    """
    Returns (caption, provider, model). Falls back to a static message if the
    local VLM is unavailable so the UI stays functional.
    """
    settings = get_settings()
    provider = (settings.vision_provider or "ollama").lower()
    try:
        text, model = local_vlm.caption_image(
            image_png_bytes=image_png_bytes,
            mime_type=mime_type or "image/png",
        )
        return text, provider, model
    except local_vlm.LocalVLMUnavailable as exc:
        logger.warning("Vision backend unavailable for caption (%s): %s", provider, exc)
        if provider == "openai":
            return (
                f"AI caption unavailable: OpenAI API unreachable — check ASSISTANT_OPENAI_API_KEY. ({exc})",
                "fallback",
                "proxy",
            )
        return (
            f"AI caption unavailable: vision backend offline. ({exc})",
            "fallback",
            "proxy",
        )
    except Exception as exc:
        logger.warning("Caption generation failed (%s): %s", provider, exc)
        return (
            f"AI caption failed ({provider}): {exc}",
            "fallback",
            "proxy",
        )


def vqa_image(
    *,
    question: str,
    image_png_bytes: bytes,
    mime_type: str,
) -> tuple[str, str, str]:
    """
    Returns (answer, provider, model). Falls back gracefully when the local
    Ollama daemon is unreachable.
    """
    settings = get_settings()
    provider = (settings.vision_provider or "ollama").lower()
    try:
        text, model = local_vlm.vqa_image(
            question=question,
            image_png_bytes=image_png_bytes,
            mime_type=mime_type or "image/png",
        )
        return text, provider, model
    except local_vlm.LocalVLMUnavailable as exc:
        logger.warning("Vision backend unavailable for VQA (%s): %s", provider, exc)
        if provider == "openai":
            return (
                f"AI visual analysis unavailable: OpenAI API unreachable — check ASSISTANT_OPENAI_API_KEY. ({exc})",
                "fallback",
                "proxy",
            )
        return (
            f"AI visual analysis unavailable: vision backend offline. ({exc})",
            "fallback",
            "proxy",
        )
    except Exception as exc:
        logger.warning("VQA generation failed (%s): %s", provider, exc)
        return (
            f"AI visual analysis failed ({provider}): {exc}",
            "fallback",
            "proxy",
        )


# ──────────────────────────────────────────────────────────────────────────────
# region disabled-cloud-providers
#
# The Gemini and HTTP-Qwen code paths below are intentionally disabled for the
# local-only deployment. They are kept here as comments so future maintainers
# can re-enable them by uncommenting and routing through
# `_generate_multimodal_with_fallback()` again.
#
# Original imports needed if re-enabled:
#     import base64, json, urllib.error, urllib.request
#
# def _generate_multimodal_with_fallback(
#     *,
#     system_instruction: str,
#     user_text: str,
#     image_png_bytes: bytes,
#     image_mime: str,
# ) -> tuple[str, str, str]:
#     settings = get_settings()
#     preferred = (settings.vision_provider or "qwen").lower()
#
#     if preferred == "qwen":
#         try:
#             logger.info("Trying Qwen VL at %s ...", settings.vision_qwen_base_url)
#             text, model = _qwen_generate_multimodal(
#                 base_url=settings.vision_qwen_base_url,
#                 api_key=settings.vision_qwen_api_key,
#                 model=settings.vision_qwen_model,
#                 system_instruction=system_instruction,
#                 user_text=user_text,
#                 image_png_bytes=image_png_bytes,
#             )
#             return text, "qwen", model
#         except Exception as exc:
#             logger.warning("Qwen VL failed (%s); falling back to Gemini.", exc)
#
#     api_key = settings.vision_gemini_api_key or settings.assistant_gemini_api_key
#     if not api_key:
#         raise ValueError("VISION_GEMINI_API_KEY is not configured (and Qwen was unavailable).")
#
#     text = _gemini_generate_multimodal(
#         api_key=api_key,
#         model=settings.vision_gemini_model,
#         system_instruction=system_instruction,
#         user_text=user_text,
#         image_bytes=image_png_bytes,
#         image_mime=image_mime,
#     )
#     return text, "gemini", settings.vision_gemini_model
# endregion disabled-cloud-providers


# ──────────────────────────────────────────────────────────────────────────────
# region disabled-cloud-providers — legacy Gemini + HTTP-Qwen helpers.
# These functions are no longer wired up; they live here as comments only so a
# future maintainer can restore them by uncommenting and re-routing
# `caption_image` / `vqa_image` through `_generate_multimodal_with_fallback`.
# Required imports (when re-enabled): base64, json, time, urllib.error,
# urllib.request.
# ──────────────────────────────────────────────────────────────────────────────
#
# def _gemini_generate_multimodal(*, api_key, model, system_instruction,
#                                 user_text, image_bytes, image_mime,
#                                 _retry=True) -> str:
#     url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
#            f"{model}:generateContent?key={api_key}")
#     payload = {
#         "systemInstruction": {"role": "system",
#                               "parts": [{"text": system_instruction}]},
#         "contents": [{
#             "role": "user",
#             "parts": [
#                 {"text": user_text},
#                 {"inline_data": {
#                     "mime_type": image_mime,
#                     "data": base64.b64encode(image_bytes).decode("ascii"),
#                 }},
#             ],
#         }],
#         "generationConfig": {"temperature": 0.3},
#     }
#     req = urllib.request.Request(
#         url=url, data=json.dumps(payload).encode("utf-8"),
#         method="POST", headers={"Content-Type": "application/json"},
#     )
#     try:
#         with urllib.request.urlopen(req, timeout=60) as resp:
#             raw = json.loads(resp.read().decode("utf-8"))
#     except urllib.error.HTTPError as exc:
#         detail = exc.read().decode("utf-8", errors="ignore")
#         logger.warning("Gemini vision HTTP %d: %s", exc.code, detail[:200])
#         if exc.code == 429 and _retry:
#             time.sleep(3)
#             return _gemini_generate_multimodal(
#                 api_key=api_key, model=model,
#                 system_instruction=system_instruction, user_text=user_text,
#                 image_bytes=image_bytes, image_mime=image_mime, _retry=False,
#             )
#         raise
#     candidates = raw.get("candidates") or []
#     content = (candidates[0].get("content") if candidates else None) or {}
#     parts = content.get("parts") or []
#     return (parts[0].get("text") if parts else "").strip() or "I couldn't generate a response."
#
#
# def _qwen_generate_multimodal(*, base_url, api_key, model,
#                               system_instruction, user_text,
#                               image_png_bytes) -> tuple[str, str]:
#     """Qwen2.5-VL via an OpenAI-compatible endpoint (vLLM / HF router)."""
#     if not base_url:
#         raise ValueError("VISION_QWEN_BASE_URL is not configured.")
#     url, resolved_model = _resolve_qwen_endpoint(base_url=base_url, model=model)
#     data_url = ("data:image/png;base64,"
#                 + base64.b64encode(image_png_bytes).decode("ascii"))
#     payload = {
#         "model": resolved_model,
#         "messages": [
#             {"role": "system", "content": system_instruction},
#             {"role": "user", "content": [
#                 {"type": "text", "text": user_text},
#                 {"type": "image_url", "image_url": {"url": data_url}},
#             ]},
#         ],
#         "temperature": 0.3,
#     }
#     headers = {"Content-Type": "application/json"}
#     if api_key:
#         headers["Authorization"] = f"Bearer {api_key}"
#     req = urllib.request.Request(
#         url=url, data=json.dumps(payload).encode("utf-8"),
#         method="POST", headers=headers,
#     )
#     with urllib.request.urlopen(req, timeout=60) as resp:
#         raw = json.loads(resp.read().decode("utf-8"))
#     choices = raw.get("choices") or []
#     message = (choices[0].get("message") if choices else None) or {}
#     content = message.get("content") or ""
#     return (str(content).strip() or "I couldn't generate a response.",
#             resolved_model)
#
#
# def _resolve_qwen_endpoint(*, base_url: str, model: str) -> tuple[str, str]:
#     base = base_url.rstrip("/")
#     marker = "/models/"
#     if "huggingface.co" in base and marker in base:
#         model_from_url = base.split(marker, 1)[1]
#         if model_from_url.endswith("/v1"):
#             model_from_url = model_from_url[:-3].rstrip("/")
#         resolved_model = model_from_url or model
#         return ("https://router.huggingface.co/v1/chat/completions",
#                 resolved_model)
#     return f"{base}/chat/completions", model
# endregion disabled-cloud-providers
