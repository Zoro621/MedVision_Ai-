"""
Patch adaptive_learning.py:
1. Already done via tool: added logging/time/urllib.error imports + logger
2. Replace bloated prompts with slim ones (cuts token usage ~70%)
3. Add 429 retry-with-backoff + clear error messages to _call_gemini_json
"""
import re

path = "backend/app/services/adaptive_learning.py"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# PATCH A: Slim down the prompt building inside _generate_with_gemini
# We replace from `context = _build_generation_context` to just before
# `return _call_gemini_json`
# ─────────────────────────────────────────────────────────────────────────────
OLD_PROMPTS = (
    "    context = _build_generation_context(scope=scope)\r\n"
    "    if kind == \"flashcards\":\r\n"
    "        system_prompt = (\r\n"
    "            \"You are a radiology education expert.\\n\"\r\n"
    "            f\"Given the following chat/document context, generate {count} flashcards.\\n\"\r\n"
    "            \"Each flashcard must:\\n\"\r\n"
    "            f\"- Test a distinct concept not already covered by existing flashcard IDs: {existing_ids}\\n\"\r\n"
    "            '- Be in JSON format: { \"front\": \"...\", \"back\": \"...\", \"topic\": \"...\", \"difficulty\": 1-5 }\\n'\r\n"
    "            \"- Never duplicate a concept already in the provided existing_ids list\"\r\n"
    "        )\r\n"
    "        user_prompt = (\r\n"
    "            f\"Recent chat and document context:\\n{context}\\n\\n\"\r\n"
    "            f\"Existing flashcard IDs to exclude: {json.dumps(existing_ids)}\\n\"\r\n"
    "            f\"Existing flashcard fronts/concepts to avoid repeating: {json.dumps(prior_texts[-30:])}\\n\\n\"\r\n"
    "            'Return a JSON object with one key: \"flashcards\".'\r\n"
    "        )\r\n"
    "    else:\r\n"
    "        weak_topics = weak_topics or []\r\n"
    "        other_topics = other_topics or []\r\n"
    "        weak_quota = round(count * 0.7) if weak_topics else 0\r\n"
    "        other_quota = max(0, count - weak_quota)\r\n"
    "        system_prompt = (\r\n"
    "            \"You are a radiology education expert.\\n\"\r\n"
    "            f\"Given the following chat context and the student's weak topics: {weak_topics},\\n\"\r\n"
    "            f\"generate {count} MCQ questions.\\n\"\r\n"
    "            \"Each question must:\\n\"\r\n"
    "            \"- Target one of the weak topics\\n\"\r\n"
    "            f\"- Not be identical to any question in existing_ids: {existing_ids}\\n\"\r\n"
    "            \"- Vary wording, options, and scenario from previous questions on the same concept\\n\"\r\n"
    "            '- Be in JSON format: { \"stem\": \"...\", \"options\": [\"A\",\"B\",\"C\",\"D\"], \"correct\": \"A\", \"explanation\": \"...\", \"topic\": \"...\", \"difficulty\": 1-5 }'\r\n"
    "        )\r\n"
    "        user_prompt = (\r\n"
    "            f\"Recent chat and document context:\\n{context}\\n\\n\"\r\n"
    "            f\"Weak topics ranked by failure rate: {json.dumps(weak_topics)}\\n\"\r\n"
    "            f\"Other topics available in this chat: {json.dumps(other_topics)}\\n\"\r\n"
    "            f\"Target split: {weak_quota} questions from weak topics and {other_quota} from other chat topics when possible.\\n\"\r\n"
    "            f\"Existing question IDs to exclude: {json.dumps(existing_ids)}\\n\"\r\n"
    "            f\"Prior question stems to avoid semantic repetition: {json.dumps(prior_texts[-40:])}\\n\\n\"\r\n"
    "            'Return a JSON object with one key: \"questions\".'\r\n"
    "        )\r\n"
    "\r\n"
    "    return _call_gemini_json(\r\n"
)

NEW_PROMPTS = (
    "    # Trim context to cut token usage (main cause of 429 quota errors)\r\n"
    "    context = _build_generation_context(scope=scope, max_chars=5000)\r\n"
    "    prior_sample = prior_texts[-10:]   # cap at 10 instead of 30-40\r\n"
    "    excluded_count = len(existing_ids)  # send count only, not full UUID list\r\n"
    "\r\n"
    "    if kind == \"flashcards\":\r\n"
    "        system_prompt = (\r\n"
    "            \"You are a radiology education expert. \"\r\n"
    "            f\"Generate exactly {count} flashcards from the context below. \"\r\n"
    "            \"Each must cover a distinct concept not previously generated. \"\r\n"
    "            'Return ONLY valid JSON: {\"flashcards\": [{\"front\": \"Q\", \"back\": \"A\", \"topic\": \"T\", \"difficulty\": 2}]}'\r\n"
    "        )\r\n"
    "        user_prompt = (\r\n"
    "            f\"Context:\\n{context}\\n\\n\"\r\n"
    "            f\"Already generated: {excluded_count} flashcards. \"\r\n"
    "            f\"Avoid repeating these recent concepts: {json.dumps(prior_sample)}\\n\"\r\n"
    "            f'Return JSON with key \"flashcards\" containing {count} new cards.'\r\n"
    "        )\r\n"
    "    else:\r\n"
    "        weak_topics = weak_topics or []\r\n"
    "        other_topics = other_topics or []\r\n"
    "        system_prompt = (\r\n"
    "            \"You are a radiology education expert. \"\r\n"
    "            f\"Generate exactly {count} MCQ questions from the context below. \"\r\n"
    "            \"Prioritise weak topics if provided. \"\r\n"
    "            'Return ONLY valid JSON: {\"questions\": [{\"stem\": \"Q\", \"options\": [\"A. x\", \"B. y\", \"C. z\", \"D. w\"], \"correct\": \"A\", \"explanation\": \"E\", \"topic\": \"T\", \"difficulty\": 2}]}'\r\n"
    "        )\r\n"
    "        user_prompt = (\r\n"
    "            f\"Context:\\n{context}\\n\\n\"\r\n"
    "            f\"Weak topics (prioritise): {json.dumps(weak_topics[:5])}\\n\"\r\n"
    "            f\"Other topics: {json.dumps(other_topics[:5])}\\n\"\r\n"
    "            f\"Already generated: {excluded_count} questions. \"\r\n"
    "            f\"Avoid repeating these recent stems: {json.dumps(prior_sample)}\\n\"\r\n"
    "            f'Return JSON with key \"questions\" containing {count} new questions.'\r\n"
    "        )\r\n"
    "\r\n"
    "    logger.info(\"Gemini generation: kind=%s count=%d model=%s\", kind, count, model)\r\n"
    "    return _call_gemini_json(\r\n"
)

if OLD_PROMPTS in src:
    src = src.replace(OLD_PROMPTS, NEW_PROMPTS)
    print("PATCH A applied: prompts slimmed")
else:
    # Try LF variant
    OLD_PROMPTS_LF = OLD_PROMPTS.replace("\r\n", "\n")
    NEW_PROMPTS_LF = NEW_PROMPTS.replace("\r\n", "\n")
    if OLD_PROMPTS_LF in src:
        src = src.replace(OLD_PROMPTS_LF, NEW_PROMPTS_LF)
        print("PATCH A applied (LF variant): prompts slimmed")
    else:
        print("PATCH A FAILED: target string not found")
        # Show context around the function
        idx = src.find("context = _build_generation_context")
        print(f"  Found at index: {idx}")
        if idx >= 0:
            print(repr(src[idx:idx+200]))

# ─────────────────────────────────────────────────────────────────────────────
# PATCH B: Add 429 retry + proper error handling to _call_gemini_json
# ─────────────────────────────────────────────────────────────────────────────
OLD_CALL = (
    "    with urllib.request.urlopen(request, timeout=90) as response:\r\n"
    "        raw = json.loads(response.read().decode(\"utf-8\"))\r\n"
    "\r\n"
    "    candidates = raw.get(\"candidates\") or []\r\n"
    "    content = (candidates[0].get(\"content\") if candidates else None) or {}\r\n"
    "    parts = content.get(\"parts\") or []\r\n"
    "    text = (parts[0].get(\"text\") if parts else None) or \"{}\"\r\n"
    "    return _extract_json(text)\r\n"
)

NEW_CALL = (
    "    try:\r\n"
    "        with urllib.request.urlopen(request, timeout=90) as response:\r\n"
    "            raw = json.loads(response.read().decode(\"utf-8\"))\r\n"
    "    except urllib.error.HTTPError as exc:\r\n"
    "        detail = exc.read().decode(\"utf-8\", errors=\"ignore\")\r\n"
    "        if exc.code == 429:\r\n"
    "            if getattr(_call_gemini_json, '_retrying', False):\r\n"
    "                raise ValueError(\r\n"
    "                    \"Gemini quota exceeded (HTTP 429). \"\r\n"
    "                    \"Wait ~1 min and retry, or add a Groq fallback: set \"\r\n"
    "                    \"ASSISTANT_LLM_PROVIDER=openai and ASSISTANT_OPENAI_API_KEY in backend/.env. \"\r\n"
    "                    f\"Detail: {detail[:300]}\"\r\n"
    "                ) from exc\r\n"
    "            logger.warning(\"Gemini 429 rate-limit; waiting 5 s then retrying once.\")\r\n"
    "            import time as _time; _time.sleep(5)\r\n"
    "            _call_gemini_json._retrying = True\r\n"
    "            try:\r\n"
    "                return _call_gemini_json(\r\n"
    "                    api_key=api_key, model=model,\r\n"
    "                    system_prompt=system_prompt, user_prompt=user_prompt,\r\n"
    "                )\r\n"
    "            finally:\r\n"
    "                _call_gemini_json._retrying = False\r\n"
    "        if exc.code in (400, 403):\r\n"
    "            raise ValueError(\r\n"
    "                f\"Gemini rejected request (HTTP {exc.code}). \"\r\n"
    "                \"Verify ASSISTANT_GEMINI_API_KEY is valid and Generative Language API is enabled. \"\r\n"
    "                f\"Detail: {detail[:300]}\"\r\n"
    "            ) from exc\r\n"
    "        raise ValueError(f\"Gemini HTTP {exc.code}: {detail[:300] or 'request failed'}\") from exc\r\n"
    "    except Exception as exc:\r\n"
    "        raise ValueError(f\"Gemini network error: {exc}\") from exc\r\n"
    "\r\n"
    "    candidates = raw.get(\"candidates\") or []\r\n"
    "    content = (candidates[0].get(\"content\") if candidates else None) or {}\r\n"
    "    parts = content.get(\"parts\") or []\r\n"
    "    text = (parts[0].get(\"text\") if parts else None) or \"{}\"\r\n"
    "    return _extract_json(text)\r\n"
)

if OLD_CALL in src:
    src = src.replace(OLD_CALL, NEW_CALL)
    print("PATCH B applied: retry logic added")
else:
    OLD_CALL_LF = OLD_CALL.replace("\r\n", "\n")
    NEW_CALL_LF = NEW_CALL.replace("\r\n", "\n")
    if OLD_CALL_LF in src:
        src = src.replace(OLD_CALL_LF, NEW_CALL_LF)
        print("PATCH B applied (LF): retry logic added")
    else:
        print("PATCH B FAILED: target string not found")
        idx = src.find("with urllib.request.urlopen(request, timeout=90)")
        print(f"  urlopen found at index: {idx}")
        if idx >= 0:
            print(repr(src[idx:idx+200]))

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("\nAll patches complete.")
print(f"File size: {len(src)} chars")
