"""
Local Vision-LLM client — Qwen2.5-VL via Ollama.

Ollama exposes multimodal models (Qwen2.5-VL, LLaVA, etc.) via two endpoints:
  - `/v1/chat/completions` (OpenAI-compatible, with `image_url` content parts)
  - `/api/chat`            (Ollama-native, with `images: [base64,...]` per msg)

We use the OpenAI-compatible path everywhere so the call shape matches
`local_llm.chat()`. Image bytes are passed inline as `data:image/png;base64,...`.

Public surface
--------------
    caption_image(image_png_bytes, mime_type="image/png") -> (text, model)
    vqa_image(question, image_png_bytes, mime_type="image/png") -> (text, model)
    generate_multimodal(system, user_text, image_png_bytes, mime) -> (text, model)
    is_available() -> bool

Notes
-----
* Qwen2.5-VL is gated behind a model pull: `ollama pull qwen2.5vl:7b-q4_K_M`.
* Outputs are deterministic at low `temperature`; we default to 0.2 for
  caption/VQA which gives reproducible educational answers.
* Errors are wrapped in `LocalVLMError` and the call sites in `vision.py`
  fall back gracefully so the UI never sees a 500 from the VLM alone.
"""
from __future__ import annotations

import base64
import json
import logging
import time
import urllib.error
import urllib.request
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Errors
# ──────────────────────────────────────────────────────────────────────────────

class LocalVLMError(RuntimeError):
    """Raised when the local VLM fails to return a usable answer."""


class LocalVLMUnavailable(LocalVLMError):
    """Raised when the Ollama daemon is unreachable."""


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

CAPTION_SYSTEM = (
    "You are a radiology education assistant. Produce a concise chest X-ray "
    "style caption. Be careful: if the modality is not clearly a CXR, say so. "
    "Output only the caption text."
)

VQA_SYSTEM = (
    "You are MedVision AI, a radiology tutor specialising in chest X-rays. "
    "Answer educationally with key signs and differentials. "
    "Do not provide a definitive clinical diagnosis for a real patient; "
    "suggest clinical correlation."
)


def caption_image(
    *,
    image_png_bytes: bytes,
    mime_type: str = "image/png",
) -> tuple[str, str]:
    """
    Return (caption_text, model_name). Raises LocalVLMError on hard failure.
    """
    return generate_multimodal(
        system_instruction=CAPTION_SYSTEM,
        user_text="Caption this medical image for a radiology student.",
        image_png_bytes=image_png_bytes,
        image_mime=mime_type,
    )


def vqa_image(
    *,
    question: str,
    image_png_bytes: bytes,
    mime_type: str = "image/png",
) -> tuple[str, str]:
    """
    Visual Question Answering. Returns (answer_text, model_name).
    """
    return generate_multimodal(
        system_instruction=VQA_SYSTEM,
        user_text=question.strip() or "Describe the most relevant findings.",
        image_png_bytes=image_png_bytes,
        image_mime=mime_type,
    )


def generate_multimodal(
    *,
    system_instruction: str,
    user_text: str,
    image_png_bytes: bytes,
    image_mime: str = "image/png",
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
    timeout_s: int | None = None,
) -> tuple[str, str]:
    """
    Generic multimodal call. Returns (response_text, model_name).
    Routes through OpenAI when vision_provider=openai, else Ollama.
    """
    settings = get_settings()
    provider = (settings.vision_provider or "ollama").lower()

    data_url = (
        f"data:{image_mime or 'image/png'};base64,"
        + base64.b64encode(image_png_bytes).decode("ascii")
    )

    messages = [
        {"role": "system", "content": system_instruction},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": user_text},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        },
    ]

    if provider == "openai":
        resolved_model = model or settings.openai_vision_model
        raw = _post_openai_completion(
            messages=messages,
            model=resolved_model,
            temperature=temperature if temperature is not None else 0.2,
            max_tokens=max_tokens or 1024,
            timeout_s=timeout_s,
        )
        text = _extract_text(raw)
        return text, resolved_model

    # Ollama path
    resolved_model = model or settings.ollama_vision_model
    body: dict[str, Any] = {
        "model": resolved_model,
        "messages": messages,
        "temperature": (
            temperature if temperature is not None else settings.ollama_temperature
        ),
        "max_tokens": max_tokens or settings.ollama_chat_max_tokens,
        "stream": False,
    }

    raw = _post_chat_completion(body, timeout_s=timeout_s)
    text = _extract_text(raw)
    return text, resolved_model


def is_available() -> bool:
    """Returns True if the configured vision backend is reachable."""
    settings = get_settings()
    provider = (settings.vision_provider or "ollama").lower()
    if provider == "openai":
        return bool(settings.assistant_openai_api_key)
    try:
        info = _health()
        return bool(info.get("vision_model_present"))
    except Exception:
        return False


# ──────────────────────────────────────────────────────────────────────────────
# Internal helpers (mirror local_llm.py — kept separate so vision-only deploys
# can use this module without dragging in chat-only logic, and so we have one
# obvious place to add image-token cost tracking later.)
# ──────────────────────────────────────────────────────────────────────────────

def _post_chat_completion(
    body: dict[str, Any],
    *,
    timeout_s: int | None,
) -> dict[str, Any]:
    settings = get_settings()
    url = settings.ollama_base_url.rstrip("/") + "/v1/chat/completions"
    timeout = timeout_s or settings.ollama_request_timeout_s

    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url=url,
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json"},
    )

    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        logger.warning(
            "Ollama VLM HTTP %d at %s after %.2fs: %s",
            exc.code, url, time.monotonic() - started, detail[:300],
        )
        raise LocalVLMError(
            f"Ollama VLM returned HTTP {exc.code}: {detail[:200]}"
        ) from exc
    except urllib.error.URLError as exc:
        logger.warning("Ollama VLM unreachable at %s: %s", url, exc)
        raise LocalVLMUnavailable(f"Ollama unreachable at {url}: {exc}") from exc

    logger.debug(
        "Ollama VLM OK in %.2fs (model=%s).",
        time.monotonic() - started,
        body["model"],
    )
    return raw


def _post_openai_completion(
    *,
    messages: list[dict],
    model: str,
    temperature: float,
    max_tokens: int,
    timeout_s: int | None = None,
) -> dict[str, Any]:
    """POST to OpenAI /v1/chat/completions for vision."""
    settings = get_settings()
    api_key = settings.assistant_openai_api_key
    if not api_key:
        raise LocalVLMUnavailable("ASSISTANT_OPENAI_API_KEY is not set.")
    base_url = settings.assistant_openai_base_url.rstrip("/")

    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }

    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url=f"{base_url}/chat/completions",
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    timeout = timeout_s or settings.ollama_request_timeout_s
    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        logger.warning(
            "OpenAI VLM HTTP %d after %.2fs: %s",
            exc.code, time.monotonic() - started, detail[:300],
        )
        raise LocalVLMError(f"OpenAI VLM returned HTTP {exc.code}: {detail[:200]}") from exc
    except urllib.error.URLError as exc:
        raise LocalVLMUnavailable(f"OpenAI VLM unreachable: {exc}") from exc

    logger.debug(
        "OpenAI VLM OK in %.2fs (model=%s).",
        time.monotonic() - started, model,
    )
    return raw


def _extract_text(raw: dict[str, Any]) -> str:
    choices = raw.get("choices") or []
    if not choices:
        raise LocalVLMError(f"No choices in Ollama VLM response: {raw}")
    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, list):  # multimodal can return a list of parts
        text = "".join(
            part.get("text", "") for part in content if isinstance(part, dict)
        )
    else:
        text = str(content or "").strip()
    if not text:
        raise LocalVLMError("Empty completion from local VLM.")
    return text.strip()


def _health() -> dict[str, Any]:
    """Helper that mirrors local_llm.health() but reports vision-model presence."""
    settings = get_settings()
    url = settings.ollama_base_url.rstrip("/") + "/api/tags"
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as exc:
        raise LocalVLMUnavailable(f"Ollama unreachable at {url}: {exc}") from exc
    models = [m.get("name") for m in data.get("models", []) if isinstance(m, dict)]
    return {
        "base_url": settings.ollama_base_url,
        "vision_model": settings.ollama_vision_model,
        "available_models": models,
        "vision_model_present": settings.ollama_vision_model in models,
    }
