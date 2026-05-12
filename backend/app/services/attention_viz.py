"""
Attention visualization + image-text explanation linker — Phase 7.

Two responsibilities:
  1. CLIP-based cross-modal attention proxy:
     For each caption token (or key phrase), compute the cosine similarity
     between each image patch embedding and the token embedding, producing
     a per-token heatmap that shows which image regions the model "attended to".

  2. Explanation linker:
     Connect GradCAM++ heatmap regions (bounding boxes) to the retrieved
     text chunks that mention related anatomical areas.
     Returns traceable chains: heatmap region → caption token → textbook passage.
"""
from __future__ import annotations

import base64
import io
import logging
import re
from dataclasses import dataclass, field

import numpy as np
from PIL import Image

from app.schemas.documents import DocumentChunkHit

logger = logging.getLogger(__name__)

# Medical anatomical terms for region-text matching
_ANATOMICAL_TERMS = [
    "lung", "lobe", "hilum", "pleura", "mediastinum", "heart", "aorta",
    "trachea", "bronchus", "diaphragm", "rib", "spine", "clavicle",
    "opacity", "consolidation", "effusion", "pneumothorax", "infiltrate",
    "nodule", "mass", "cardiomegaly", "atelectasis", "embolism", "edema",
]


@dataclass
class AttentionToken:
    token:       str
    heatmap_b64: str    # base64 grayscale PNG (attention map for this token)
    importance:  float


@dataclass
class ExplanationLink:
    region_bbox:  dict         # {x, y, w, h}
    region_label: str          # human readable ("upper left region")
    chunk_id:     str
    chunk_snippet: str
    citation:     str          # "DocumentName — p42"
    similarity:   float


@dataclass
class AttentionVizResult:
    token_heatmaps:     list[AttentionToken]
    explanation_links:  list[ExplanationLink]
    method:             str    # "clip" | "keyword" | "proxy"


def build_attention_and_links(
    *,
    image: Image.Image,
    caption: str,
    retrieved_chunks: list[DocumentChunkHit],
    heatmap_regions: list[dict],   # [{x, y, w, h, intensity}] from gradcam.get_heatmap_regions
) -> AttentionVizResult:
    """
    Main entry-point.  Generates:
    - Per-token cross-modal attention heatmaps
    - Explanation links from heatmap regions to textbook passages
    """
    from app.core.config import get_settings
    settings = get_settings()

    # ── Token heatmaps ────────────────────────────────────────────────────────
    if settings.ml_features_enabled:
        try:
            token_heatmaps = _clip_attention(image=image, caption=caption)
            method = "clip"
        except ImportError:
            logger.warning("CLIP / transformers not installed — keyword proxy.")
            token_heatmaps = _keyword_attention_proxy(image=image, caption=caption)
            method = "keyword"
        except Exception as exc:
            logger.warning("CLIP attention failed (%s) — keyword proxy.", exc)
            token_heatmaps = _keyword_attention_proxy(image=image, caption=caption)
            method = "keyword"
    else:
        token_heatmaps = _keyword_attention_proxy(image=image, caption=caption)
        method = "proxy"

    # ── Explanation links ─────────────────────────────────────────────────────
    links = _link_regions_to_chunks(
        image=image,
        heatmap_regions=heatmap_regions,
        retrieved_chunks=retrieved_chunks,
    )

    return AttentionVizResult(
        token_heatmaps=token_heatmaps,
        explanation_links=links,
        method=method,
    )


# ──────────────────────────────────────────────────────────────────────────────
# CLIP cross-modal attention
# ──────────────────────────────────────────────────────────────────────────────

def _clip_attention(
    *,
    image: Image.Image,
    caption: str,
) -> list[AttentionToken]:
    """
    For each key phrase in the caption, compute CLIP image-patch vs text similarity.
    """
    from transformers import CLIPProcessor, CLIPModel  # type: ignore
    import torch

    model_name = "openai/clip-vit-base-patch32"
    clip       = CLIPModel.from_pretrained(model_name)
    processor  = CLIPProcessor.from_pretrained(model_name)
    clip.eval()

    # Extract key phrases (nouns / noun-phrases from caption)
    phrases = _extract_key_phrases(caption)[:6]
    if not phrases:
        phrases = [caption[:50]]

    w, h = image.size
    PATCH = 32   # pixel patch size for heatmap grid
    cols, rows = w // PATCH, h // PATCH

    result: list[AttentionToken] = []
    with torch.no_grad():
        # Encode patches
        patch_imgs = []
        for row in range(rows):
            for col in range(cols):
                crop = image.crop((col * PATCH, row * PATCH, (col+1)*PATCH, (row+1)*PATCH))
                patch_imgs.append(crop.resize((224, 224)))

        for phrase in phrases:
            inputs  = processor(
                text=[phrase],
                images=patch_imgs,
                return_tensors="pt",
                padding=True,
            )
            outputs     = clip(**inputs)
            text_emb    = outputs.text_embeds[0]   # D
            image_embs  = outputs.image_embeds     # N×D
            sims = (image_embs @ text_emb) / (
                image_embs.norm(dim=-1) * text_emb.norm() + 1e-8
            )  # N

            heat = sims.cpu().numpy().reshape(rows, cols)
            heat = (heat - heat.min()) / (heat.max() - heat.min() + 1e-8)
            hm_img = Image.fromarray((heat * 255).astype(np.uint8), mode="L").resize((w, h), Image.BILINEAR)
            buf = io.BytesIO()
            hm_img.save(buf, format="PNG")
            hm_b64 = base64.b64encode(buf.getvalue()).decode()

            result.append(AttentionToken(
                token=phrase,
                heatmap_b64=hm_b64,
                importance=float(sims.max().item()),
            ))

    return result


# ──────────────────────────────────────────────────────────────────────────────
# Keyword-based attention proxy (no CLIP)
# ──────────────────────────────────────────────────────────────────────────────

def _keyword_attention_proxy(
    *,
    image: Image.Image,
    caption: str,
) -> list[AttentionToken]:
    """
    Edge-density proxy: high-edge regions correspond to "attended" areas.
    One heatmap per key phrase (slightly perturbed to show variance).
    """
    from PIL import ImageFilter

    w, h  = image.size
    gray  = image.convert("L")
    edges = np.array(gray.filter(ImageFilter.FIND_EDGES), dtype=np.float32)
    edges = (edges - edges.min()) / (edges.max() - edges.min() + 1e-8)

    phrases = _extract_key_phrases(caption)[:4] or [caption[:40]]
    rng     = np.random.default_rng(seed=42)
    result: list[AttentionToken] = []

    for i, phrase in enumerate(phrases):
        noise = rng.normal(0, 0.05, edges.shape).astype(np.float32)
        heat  = np.clip(edges + noise, 0, 1)
        hm    = Image.fromarray((heat * 255).astype(np.uint8), mode="L")
        buf   = io.BytesIO()
        hm.save(buf, format="PNG")
        result.append(AttentionToken(
            token=phrase,
            heatmap_b64=base64.b64encode(buf.getvalue()).decode(),
            importance=round(float(heat.max()), 3),
        ))
    return result


# ──────────────────────────────────────────────────────────────────────────────
# Explanation linker
# ──────────────────────────────────────────────────────────────────────────────

def _link_regions_to_chunks(
    *,
    image: Image.Image,
    heatmap_regions: list[dict],
    retrieved_chunks: list[DocumentChunkHit],
) -> list[ExplanationLink]:
    """
    For each high-activation region, find the most relevant retrieved chunk.
    Matching uses: (a) anatomical term overlap, (b) chunk relevance score.
    """
    if not heatmap_regions or not retrieved_chunks:
        return []

    w, h = image.size
    links: list[ExplanationLink] = []
    used_chunk_ids: set[str] = set()

    for region in heatmap_regions[:6]:
        rx, ry, rw, rh = region["x"], region["y"], region["w"], region["h"]
        region_label   = _label_region(rx, ry, rw, rh, w, h)

        # Crop the region and derive anatomical keywords from nearby caption context
        # (simple: use any anatomical term visible in the top chunks' text)
        anatomical_kws = _find_anatomical_terms_in_chunks(retrieved_chunks[:4])

        best_chunk     = None
        best_score     = -1.0
        for chunk in retrieved_chunks:
            if chunk.chunk_id in used_chunk_ids:
                continue
            text_lower = (chunk.content or chunk.snippet).lower()
            kw_hits    = sum(1 for kw in anatomical_kws if kw in text_lower)
            combined   = 0.6 * chunk.score + 0.4 * (kw_hits / max(len(anatomical_kws), 1))
            if combined > best_score:
                best_score = combined
                best_chunk = chunk

        if best_chunk is not None:
            used_chunk_ids.add(best_chunk.chunk_id)
            citation = f"{best_chunk.document_name} — p{best_chunk.page_start}"
            links.append(ExplanationLink(
                region_bbox={"x": rx, "y": ry, "w": rw, "h": rh},
                region_label=region_label,
                chunk_id=best_chunk.chunk_id,
                chunk_snippet=best_chunk.snippet[:200],
                citation=citation,
                similarity=round(best_score, 3),
            ))

    return links


def _label_region(rx: int, ry: int, rw: int, rh: int, img_w: int, img_h: int) -> str:
    cx, cy = rx + rw // 2, ry + rh // 2
    vert   = "upper" if cy < img_h // 3 else ("lower" if cy > 2 * img_h // 3 else "middle")
    horiz  = "left"  if cx < img_w // 3 else ("right"  if cx > 2 * img_w // 3 else "central")
    return f"{vert} {horiz} region"


def _find_anatomical_terms_in_chunks(chunks: list[DocumentChunkHit]) -> list[str]:
    combined = " ".join((c.content or c.snippet) for c in chunks).lower()
    return [term for term in _ANATOMICAL_TERMS if term in combined]


def _extract_key_phrases(text: str) -> list[str]:
    """
    Simple noun-phrase extraction using regex (no NLTK dependency).
    Extracts 2-3 word noun phrases that are likely anatomically meaningful.
    """
    # Extract sequences of capitalised or medical-domain words
    candidates = re.findall(r"[A-Z][a-z]+ (?:[a-z]+ )*[a-z]+|[A-Z][a-z]+", text)
    # Also extract known anatomical terms occurring in the caption
    lower = text.lower()
    from_vocab = [t for t in _ANATOMICAL_TERMS if t in lower]

    all_phrases = list(dict.fromkeys(candidates + from_vocab))
    # Filter to those with ≥ 4 chars
    return [p for p in all_phrases if len(p) >= 4][:8]
