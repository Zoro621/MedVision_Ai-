"""
Local LLM client — Ollama via the OpenAI-compatible API.

The MedVision backend runs entirely on local inference. This module is the
single chokepoint that talks to the Ollama daemon (`http://localhost:11434`)
for text-only chat completions used by:

  - The agentic RAG generator + verifier + planner (services/rag_agent.py,
    services/rag_graph.py).
  - Adaptive learning content generation (services/adaptive_learning.py).
  - Medical-chat free-form answers.

Why Ollama instead of `transformers` in-process?
------------------------------------------------
With 6 GB of VRAM (RTX 3060) we cannot keep both Llama-3.1-8B and Qwen2.5-VL-7B
resident at the same time. Ollama hot-swaps quantised models in/out of GPU
memory transparently, which is significantly more practical than manual
load/unload juggling with `bitsandbytes`. It also gives us a stable
OpenAI-compatible HTTP API we can drive without extra dependencies.

Public surface
--------------
    chat(messages=[...], json_mode=False) -> str
    chat_json(messages=[...]) -> dict | list
    is_available() -> bool
    health() -> dict

`messages` follows the OpenAI chat schema:
    [{"role": "system" | "user" | "assistant", "content": "..."}]
"""
from __future__ import annotations

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

class LocalLLMError(RuntimeError):
    """Raised when the local LLM server fails or returns an unparseable answer."""


class LocalLLMUnavailable(LocalLLMError):
    """Raised when the Ollama daemon is unreachable."""


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def chat(
    *,
    messages: list[dict[str, str]],
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
    json_mode: bool = False,
    stop: list[str] | None = None,
    timeout_s: int | None = None,
) -> str:
    """
    Send `messages` to the local LLM and return the assistant's text content.

    Parameters
    ----------
    messages
        OpenAI-style chat messages: [{"role": "system"|"user"|"assistant", "content": "..."}]
    model
        Override of `settings.ollama_chat_model` (defaults to llama3.1:8b-instruct-q4_K_M).
    json_mode
        If True, ask Ollama to constrain output to a valid JSON object.
        Use `chat_json()` if you also want it parsed.
    """
    settings = get_settings()
    provider = (settings.assistant_llm_provider or "ollama").lower()

    if provider == "openai":
        return _openai_chat(
            messages=messages,
            model=model or settings.assistant_openai_model,
            temperature=temperature if temperature is not None else settings.ollama_temperature,
            max_tokens=max_tokens or settings.assistant_openai_max_tokens,
            json_mode=json_mode,
            stop=stop,
            timeout_s=timeout_s,
        )

    # Ollama path
    body: dict[str, Any] = {
        "model": model or settings.ollama_chat_model,
        "messages": messages,
        "temperature": (
            temperature if temperature is not None else settings.ollama_temperature
        ),
        "max_tokens": max_tokens or settings.ollama_chat_max_tokens,
        "stream": False,
        "options": {"num_ctx": settings.ollama_num_ctx},
    }
    if stop:
        body["stop"] = stop
    if json_mode:
        body["response_format"] = {"type": "json_object"}
        body["format"] = "json"

    raw = _post_chat_completion(body, timeout_s=timeout_s)
    return _extract_text(raw)


def chat_json(
    *,
    messages: list[dict[str, str]],
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
    timeout_s: int | None = None,
) -> Any:
    """
    Same as `chat()` but parses and returns the response as JSON.
    Raises `LocalLLMError` if the model output is not valid JSON.
    """
    text = chat(
        messages=messages,
        model=model,
        temperature=temperature if temperature is not None else 0.0,
        max_tokens=max_tokens,
        json_mode=True,
        timeout_s=timeout_s,
    )
    return _parse_json_lenient(text)


def is_available() -> bool:
    """Cheap probe: returns True if the configured LLM backend is reachable."""
    settings = get_settings()
    provider = (settings.assistant_llm_provider or "ollama").lower()
    if provider == "openai":
        return bool(settings.assistant_openai_api_key)
    try:
        health()
        return True
    except Exception:
        return False


def health() -> dict[str, Any]:
    """
    Returns model availability info from `GET /api/tags`. Raises
    `LocalLLMUnavailable` if the server is unreachable.
    """
    settings = get_settings()
    url = settings.ollama_base_url.rstrip("/") + "/api/tags"
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as exc:
        raise LocalLLMUnavailable(f"Ollama unreachable at {url}: {exc}") from exc

    models = [m.get("name") for m in data.get("models", []) if isinstance(m, dict)]
    return {
        "base_url": settings.ollama_base_url,
        "chat_model": settings.ollama_chat_model,
        "vision_model": settings.ollama_vision_model,
        "available_models": models,
        "chat_model_present": settings.ollama_chat_model in models,
        "vision_model_present": settings.ollama_vision_model in models,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────────────────────

def _post_chat_completion(
    body: dict[str, Any],
    *,
    timeout_s: int | None,
) -> dict[str, Any]:
    """POST to /v1/chat/completions and return the parsed JSON response."""
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
            "Ollama HTTP %d at %s after %.2fs: %s",
            exc.code, url, time.monotonic() - started, detail[:300],
        )
        raise LocalLLMError(
            f"Ollama returned HTTP {exc.code}: {detail[:200]}"
        ) from exc
    except urllib.error.URLError as exc:
        logger.warning("Ollama unreachable at %s: %s", url, exc)
        raise LocalLLMUnavailable(f"Ollama unreachable at {url}: {exc}") from exc

    elapsed = time.monotonic() - started
    logger.debug("Ollama chat OK in %.2fs (%d msgs).", elapsed, len(body["messages"]))
    return raw


def _extract_text(raw: dict[str, Any]) -> str:
    """Pull `choices[0].message.content` out of an OpenAI-style response."""
    choices = raw.get("choices") or []
    if not choices:
        raise LocalLLMError(f"No choices in Ollama response: {raw}")
    message = choices[0].get("message") or {}
    text = (message.get("content") or "").strip()
    if not text:
        raise LocalLLMError("Empty completion from local LLM.")
    return text


def _openai_chat(
    *,
    messages: list[dict[str, str]],
    model: str,
    temperature: float,
    max_tokens: int,
    json_mode: bool = False,
    stop: list[str] | None = None,
    timeout_s: int | None = None,
) -> str:
    """Call the OpenAI /v1/chat/completions endpoint."""
    settings = get_settings()
    api_key = settings.assistant_openai_api_key
    if not api_key:
        raise LocalLLMUnavailable("ASSISTANT_OPENAI_API_KEY is not set.")
    base_url = settings.assistant_openai_base_url.rstrip("/")

    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }
    if stop:
        body["stop"] = stop
    if json_mode:
        body["response_format"] = {"type": "json_object"}

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
            "OpenAI HTTP %d after %.2fs: %s",
            exc.code, time.monotonic() - started, detail[:300],
        )
        raise LocalLLMError(f"OpenAI returned HTTP {exc.code}: {detail[:200]}") from exc
    except urllib.error.URLError as exc:
        raise LocalLLMUnavailable(f"OpenAI unreachable: {exc}") from exc

    elapsed = time.monotonic() - started
    logger.debug("OpenAI chat OK in %.2fs (model=%s).", elapsed, model)
    return _extract_text(raw)


def _parse_json_lenient(text: str) -> Any:
    """
    Parse `text` as JSON, trying a few recoveries common in small open-weight
    models that occasionally emit fenced or trailing prose.
    """
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip markdown fences (```json ... ``` or ``` ... ```)
    if text.startswith("```"):
        first_nl = text.find("\n")
        if first_nl > 0:
            text = text[first_nl + 1 :]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

    # Last resort: extract first {...} or [...] block
    for opener, closer in (("{", "}"), ("[", "]")):
        start = text.find(opener)
        end = text.rfind(closer)
        if start >= 0 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                continue

    raise LocalLLMError(f"Local LLM did not return valid JSON: {text[:200]!r}")
