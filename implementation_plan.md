# MedVision AI — Gap Closure + Phase 7 Implementation Plan

## Goal
Close all remaining gaps in Phases 3–6, **fully implement Phase 7** (Agentic RAG + full
explainability suite), and harden the system for deployment as a production-grade medical
education platform.

---

## User Review Required

> [!IMPORTANT]
> **BioBERT cold-start warning:** `dmis-lab/biobert-v1.1` is a 440 MB download. The first
> backend start will download it automatically from HuggingFace. Subsequent starts use the
> local cache. If the machine has no internet, place the model in `backend/model_cache/`
> and set `BIOBERT_LOCAL_PATH` in `.env`.

> [!IMPORTANT]
> **LIME/SHAP compute cost:** LIME runs ~100 masked inference passes per image. SHAP
> (DeepExplainer) requires the CheXNet DenseNet weights (`chexnet_weights.pth`, ~100 MB).
> Both are acceptable for a local deployment FYP but would need async queuing in production.
> For the first run we keep them synchronous with generous timeouts.

> [!WARNING]
> **GradCAM requires CheXNet weights.** Real GradCAM needs a pretrained CNN. We will use
> `torchvision.models.densenet121` + CheXNet-style fine-tuning weights freely available on
> HuggingFace (`arnoweng/CheXNet`). On CPU this takes ~2 s/image; on GPU <0.3 s. If weights
> are unavailable at boot, the system falls back to the existing proxy heatmap automatically.

> [!IMPORTANT]
> **New Python deps** (torch, torchvision, transformers, sentence-transformers, lime, shap,
> scipy) significantly increase image size. The Dockerfile will gain a separate
> `requirements-ml.txt` installed when `INSTALL_ML=true` (default `false`). Set
> `INSTALL_ML=true` in your Docker build to get full Phase 7 features.

---

## Architecture Changes Overview

```
Before                           After
──────────────────────────────   ──────────────────────────────────────────────
HashEmbedding (256-dim)     →   BioBERT sentence embeddings (768-dim)
Fixed single-pass RAG       →   LangGraph agentic loop (plan→retrieve→verify→answer)
Proxy Gaussian heatmap      →   True GradCAM++ (DenseNet121/CheXNet)
No LIME/SHAP                →   LIME superpixel + SHAP DeepExplainer
No faithfulness gate        →   LLM-as-judge verifier with regeneration
Admin frontend: mock data   →   All panels wired to real APIs
Simple flat chunking        →   Semantic + hierarchical chunking with cross-encoder reranking
```

---

## Proposed Changes

### Component A — Embeddings (Phase 2 quality upgrade)

#### [MODIFY] embeddings.py
- Replace `HashEmbeddingService` with `BioBERTEmbeddingService` using
  `sentence-transformers` library wrapping `dmis-lab/biobert-base-cased-v1.1`.
- Lazy-load the model on first call (no delay at startup).
- Batch encode with `model.encode(texts, batch_size=32, normalize_embeddings=True)`.
- Change `embedding_dimensions` default from `256` → `768` in config.
- Keep same public interface `embed_text()` / `embed_texts()` so all callers are unchanged.
- Provide `BIOBERT_LOCAL_PATH` env var override for air-gapped deployments.

#### [MODIFY] config.py
- Add `embedding_dimensions: int = 768`
- Add `biobert_model_name: str = "dmis-lab/biobert-base-cased-v1.1"`
- Add `biobert_local_path: str | None = None`
- Add `ml_features_enabled: bool = False` (guards GradCAM++, LIME, SHAP)
- Add `cross_encoder_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"`
- Add new agentic + verifier settings (see Phase 7 section)

#### [MODIFY] milvus_index.py
- Update collection dimension to match `settings.embedding_dimensions` (768).
- Add migration guard: if collection exists with wrong dimension, drop + recreate.

#### [MODIFY] requirements.txt + [NEW] requirements-ml.txt
- `requirements.txt`: add `sentence-transformers>=2.7.0`, `transformers>=4.40.0`,
  `torch>=2.2.0` (CPU), `torchvision>=0.17.0`, `scipy>=1.13.0`
- `requirements-ml.txt` (INSTALL_ML=true): `lime>=0.2.0.1`, `shap>=0.45.0`,
  `scikit-image>=0.22.0`

---

### Component B — Chunking (Phase 2 quality upgrade)

#### [MODIFY] chunking.py
- **Hierarchical Chunking**: Parse Chapter → Section → Paragraph hierarchy from page
  headings. Emit parent-level metadata on every child chunk for context inheritance.
- **Semantic boundary detection**: After splitting into paragraphs, measure cosine
  similarity between adjacent sentence embeddings (lightweight heuristic using
  `tokenize_text`). When similarity drops below threshold (0.3), force a chunk boundary.
- **Optimal chunk sizes for RAG**: Target 400–600 tokens (≈900–1400 chars) for
  retrieval chunks with 20% overlap (was 160 chars fixed). Larger chunks for generation
  context (up to 1800 chars) stored as `chunk_type="synthesis"`.
- **Table/figure detection**: Pages containing `TABLE`, `FIGURE`, `FIG.` patterns get
  their own atomic chunks to prevent mid-table splits.
- **Medical term boosting**: Append section heading to chunk content for BM25 weighting.
- Update `ChunkDraft` dataclass: add `parent_heading`, `hierarchy_level`, `is_table`,
  `is_figure`, `token_count`.

---

### Component C — Reranking (retrieval quality)

#### [NEW] services/reranker.py
- Cross-encoder reranker using `cross-encoder/ms-marco-MiniLM-L-6-v2` (24 MB, fast on CPU).
- `rerank_hits(query, hits, top_k) → list[DocumentChunkHit]` — scores all candidates then
  returns top_k reranked by cross-encoder score.
- Falls back to original ranking if model unavailable.

#### [MODIFY] services/retrieval.py
- After hybrid fusion, pass top `top_k * 3` candidates through the cross-encoder reranker.
- Final list is `top_k` reranked results.
- Add `RETRIEVAL_ENABLE_RERANKER=true` env var to toggle.

---

### Component D — Agentic RAG (Phase 7 core)

#### [NEW] services/rag_agent.py
Full LangGraph-style agentic loop (implemented without the heavy LangGraph dependency
using a clean state-machine pattern):

```
State: {question, plan, iterations, all_hits, answer, verified, regenerated}

Nodes:
  1. planner        → decompose query into sub-questions if complex
  2. retriever      → hybrid+rerank search for each sub-question  
  3. context_scorer → score context completeness (0.0–1.0)
  4. generator      → LLM synthesis with grounded prompting
  5. verifier       → faithfulness check (claim-by-claim NLI)
  6. decider        → loop/stop/fallback decision
  7. assembler      → merge multi-step results into final answer

Loop condition:
  - If context_score < 0.4 AND iterations < 3 → broaden query, retrieve again
  - If faithfulness fails AND iterations < 2 → regenerate with stricter prompt
  - Else → return best answer with confidence score
```

- **Query decomposition**: For questions containing "and", "compare", "difference between",
  "what are the types of", split into sub-questions and retrieve separately.
- **ReAct trace**: Each iteration logged to a new `AgentStep` model in PostgreSQL.
- **Adaptive `top_k`**: Start with k=6, expand to k=12 on retry.
- **Citations deduplication**: Merge identical passages from multiple iterations.

#### [NEW] models: AgentStep
```python
class AgentStep(Base):
    __tablename__ = "agent_steps"
    id, trace_id, step_type, step_index, input_json, output_json, elapsed_ms, created_at
```

#### [MODIFY] services/assistant.py
- Replace `answer_question()` with `run_rag_agent()` call from `rag_agent.py`.
- Keep all persistence logic unchanged.
- Expose `reasoning_steps` in `AssistantAnswer` dataclass for frontend display.

#### [MODIFY] schemas/assistant.py
- Add `reasoningSteps: list[ReasoningStep] | None` to `AssistantAskResponse`.
- Add `ReasoningStep` schema: `{stepType, description, queriesUsed, hitsCount}`.

#### [MODIFY] api/routes/assistant.py
- Pass `reasoning_steps` through to the response.

---

### Component E — Faithfulness Verification Gate (Phase 3 gap)

#### [MODIFY] services/assistant.py / rag_agent.py
- Implement **claim-level NLI verification** using the LLM-as-judge pattern:
  1. Extract atomic claims from generated answer (regex split on `. ` boundaries).
  2. Per claim: ask verifier LLM "Is this claim supported by the context? YES/NO".
  3. If > 20% of claims are unsupported → trigger regeneration with stricter prompt.
  4. After 2 failures → return extractive fallback with "Low confidence" flag.
- Works with both Gemini and OpenAI providers.
- Enable by default when `ASSISTANT_ENABLE_VERIFIER=true`.

---

### Component F — Explainability Suite (Phase 7)

#### [MODIFY] services/gradcam.py
- Upgrade to true **Grad-CAM++** using DenseNet121 (CheXNet weights or pretrained
  ImageNet as fallback).
- `generate_gradcam_heatmap_png(image, method="gradcam++")`:
  - Load DenseNet121; register forward hook on `features.denseblock4`.
  - Forward pass → compute gradient-weighted activations.
  - Produce jet colormap overlay (RGBA) blended with original image at 40% alpha.
  - Return both the raw heatmap (L mode) and the overlay (RGBA).
- If torch/weights unavailable → fall back to existing proxy automatically.

#### [NEW] services/lime_explainer.py
- `explain_image_lime(image, predict_fn, num_superpixels=100, num_samples=100)`:
  - Segment image into superpixels using `skimage.segmentation.slic`.
  - Perturb (mask) superpixel subsets, run `predict_fn` on each.
  - Fit Ridge regression to learn importance weights.
  - Return: list of `{superpixel_id, importance, bbox}` + highlighted overlay PNG.
- `predict_fn` wraps Gemini/Qwen VQA for the current image.

#### [NEW] services/shap_explainer.py
- `explain_image_shap(image, model)`:
  - Use `shap.GradientExplainer` on the DenseNet features.
  - Compute pixel-level SHAP values for top predicted class.
  - Return: SHAP value array + summary overlay PNG.
- Token-level SHAP for text answers: `explain_text_shap(answer_tokens, context_tokens)`.

#### [NEW] services/attention_viz.py
- `visualize_cross_modal_attention(image, caption, model_response)`:
  - For Gemini/Qwen responses: parse attention weights from response metadata (if
    available) OR use CLIP-based proxy alignment.
  - CLIP proxy: `clip_similarity_map(image, caption_tokens)` → heatmap per token.
  - Return: list of `{token, attention_map_png}`.

#### [NEW] services/explanation_linker.py
- `link_heatmap_to_text(heatmap_regions, retrieved_chunks)`:
  - Identify top-N active heatmap regions (bounding boxes).
  - For each region: find retrieved chunk that most mentions the anatomical area
    (using keyword matching + CLIP cosine similarity of region crop vs chunk text embedding).
  - Return: `ExplanationLink(region_bbox, caption_tokens, chunk_id, textbook_citation)`.

#### [MODIFY] api/routes/vision.py
- Extend `GET /api/vision/documents/{id}/analyze` to return:
  - `gradcamPlusPlus: {heatmapDataUrl, method, regionBboxes}`
  - `lime: {overlayDataUrl, superpixels, topRegions}` (when `include_lime=true`)
  - `shap: {overlayDataUrl, topPixels}` (when `include_shap=true`)
  - `attentionMap: {tokenHeatmaps}` (when `include_attention=true`)
  - `explanationLinks: [{regionBbox, chunkId, citation}]`
- These are opt-in via query params to avoid blocking the main response.
- Add `POST /api/vision/documents/{id}/lime` endpoint (async, returns task ID).
- Add `POST /api/vision/documents/{id}/shap` endpoint (async, returns task ID).

#### [MODIFY] app/dashboard/gradcam/page.tsx
- Add tabbed explainability panel: GradCAM++ | LIME | SHAP | Attention.
- Each tab lazy-loads its explanation from the backend.
- Add "Explanation Link" button on heatmap: clicking a highlighted region shows the
  linked textbook passage.

---

### Component G — Admin Frontend Wiring (Phase 6 gap)

All 5 admin pages still using mock data need to be wired to real APIs:

#### [MODIFY] app/admin/dashboard/page.tsx
- Replace mock stats with `GET /api/admin/analytics/overview`.
- Wire system health widget to `GET /api/health`.

#### [MODIFY] app/admin/dashboard/students/page.tsx
- Replace mock student list with `GET /api/admin/operations/students`.
- Wire suspend/reset-password actions to `POST /api/admin/operations/students/{id}/suspend`
  and `POST /api/admin/operations/students/{id}/reset-password`.

#### [MODIFY] app/admin/dashboard/analytics/page.tsx
- Replace mock charts with `GET /api/admin/analytics/overview` and
  `GET /api/admin/analytics/struggling-students`.

#### [MODIFY] app/admin/dashboard/content/page.tsx
- Replace mock quiz/deck lists with `GET /api/admin/content/quizzes` and
  `GET /api/admin/content/flashcard-decks`.
- Wire create/edit/publish/archive actions.

#### [MODIFY] app/admin/dashboard/audit-log/page.tsx
- Replace mock events with `GET /api/admin/operations/audit-log`.
- Add AI trace viewer: click on any assistant trace to see reasoning steps.

#### [NEW] lib/api/adminAnalytics.ts (update existing)
- Already exists at 2 KB — verify all endpoints and add missing ones.

---

### Component H — AssistantTrace Reasoning Step Viewer

#### [MODIFY] app/dashboard/assistant/page.tsx
- Add expandable "Reasoning steps" accordion under each assistant message when
  `reasoningSteps` is present.
- Show: plan, sub-queries used, iteration count, faithfulness result.

---

### Component I — Deployment Hardening

#### [MODIFY] Dockerfile
- Add `INSTALL_ML=false` build-arg layer for ML dependencies.
- Multi-stage: base requirements + optional ML requirements.
- Cache the BioBERT model in a Docker volume.

#### [MODIFY] docker-compose.yml
- Add `backend_ml` volume for model cache.
- Add `EMBEDDING_DIMENSIONS=768` env.
- Add `ML_FEATURES_ENABLED=true` for local dev.

#### [MODIFY] .env.example
- Add all new env vars: `BIOBERT_MODEL_NAME`, `BIOBERT_LOCAL_PATH`,
  `ML_FEATURES_ENABLED`, `RETRIEVAL_ENABLE_RERANKER`, `AGENTIC_MAX_ITERATIONS`,
  `AGENTIC_CONTEXT_SCORE_THRESHOLD`, `INSTALL_ML`.

---

## Execution Order

| Step | Description | Files Changed |
|------|-------------|---------------|
| 1 | BioBERT embeddings + config | `embeddings.py`, `config.py`, `requirements.txt` |
| 2 | Milvus dimension migration | `milvus_index.py` |
| 3 | Advanced chunking | `chunking.py` |
| 4 | Cross-encoder reranker | `reranker.py` (new), `retrieval.py` |
| 5 | AgentStep model | `models.py`, `bootstrap.py` |
| 6 | Agentic RAG loop | `rag_agent.py` (new), `assistant.py` |
| 7 | Faithfulness gate | `rag_agent.py`, `assistant.py` |
| 8 | GradCAM++ | `gradcam.py` |
| 9 | LIME explainer | `lime_explainer.py` (new) |
| 10 | SHAP explainer | `shap_explainer.py` (new) |
| 11 | Attention viz + linker | `attention_viz.py`, `explanation_linker.py` (new) |
| 12 | Vision route extensions | `routes/vision.py`, `schemas/vision.py` |
| 13 | Admin frontend wiring (5 pages) | `app/admin/dashboard/*` |
| 14 | Assistant reasoning UI | `app/dashboard/assistant/page.tsx` |
| 15 | GradCAM UI explainability tabs | `app/dashboard/gradcam/page.tsx` |
| 16 | Dockerfile + docker-compose | `Dockerfile`, `docker-compose.yml`, `.env.example` |

---

## Verification Plan

### Automated
- `pytest backend/tests/` — existing test suite still passes.
- `pytest backend/tests/test_embeddings.py` — BioBERT embed shape (768,), cosine sim > 0.8 for medically similar sentences.
- `pytest backend/tests/test_chunking.py` — hierarchical chunks have correct `parent_heading`, no table mid-splits.
- `pytest backend/tests/test_rag_agent.py` — agent loops correct number of iterations, citations deduplicated.

### Manual
1. Upload a radiology PDF → confirm chunks have `section_heading` and `parent_heading`.
2. Ask a complex question → observe reasoning steps in UI accordion.
3. Upload a chest X-ray → request GradCAM++ overlay, LIME, SHAP — all return valid images.
4. Log in as admin → all 5 dashboard panels show real data.
5. Force a low-confidence retrieval → verify "insufficient evidence" message appears.
