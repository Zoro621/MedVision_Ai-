"""
LangGraph-based agentic RAG pipeline.

This module is the LangGraph rewrite of `services/rag_agent.run_rag_agent`.
It produces the SAME `AgentAnswer` shape, so callers in
`api/routes/assistant.py` can switch by replacing the import.

Why LangGraph?
--------------
The original agent was a hand-rolled `while not state.stop` loop. As the
pipeline grew (decompose → retrieve → score → generate → verify → loop) the
control flow became hard to reason about and impossible to checkpoint or
visualise. LangGraph gives us:

  * Explicit nodes + conditional edges → readable as a DAG.
  * `MemorySaver` checkpointer → resumable runs (one trace_id per turn).
  * Built-in step events we persist directly into `agent_steps`.

What this file does NOT change
------------------------------
* Retrieval, decomposition, generation prompts, and verifier logic are all
  re-used from `rag_agent.py` (`_decompose`, `_retrieve`, `_score_context`,
  `_generate`, `_verify`, `_extractive_fallback`, `_build_citations`,
  `_compute_confidence`). The graph is purely an orchestration layer.
* The LLM call site is still `local_llm` (Ollama). LangGraph does not
  itself talk to any LLM here — nodes are plain Python functions.

Public surface
--------------
    run_rag_graph(*, db, user, question, chat_session_id, top_k=6,
                  document_ids=None, mode=..., trace_id=None) -> AgentAnswer
"""
from __future__ import annotations

import logging
import time
from typing import TypedDict

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import User
from app.schemas.assistant import AssistantMode
from app.schemas.documents import DocumentChunkHit
from app.services.rag_agent import (
    AgentAnswer,
    _broaden,
    _build_citations,
    _compute_confidence,
    _decompose,
    _extractive_fallback,
    _generate,
    _log_step,
    _medical_chat,
    _merge_hits,
    _model_name,
    _resolve_provider,
    _retrieve,
    _score_context,
    _State,
    _verify,
)

logger = logging.getLogger(__name__)

# We import LangGraph lazily so the rest of the app still boots if the wheel
# is not yet installed. The runner falls back to the legacy `run_rag_agent`
# implementation in that case (one less hard requirement during dev).
try:
    from langgraph.graph import END, START, StateGraph  # type: ignore
    from langgraph.checkpoint.memory import MemorySaver  # type: ignore

    LANGGRAPH_AVAILABLE = True
except ImportError:  # pragma: no cover — exercised only on bare envs
    LANGGRAPH_AVAILABLE = False
    StateGraph = None  # type: ignore
    MemorySaver = None  # type: ignore
    START = "__start__"  # type: ignore
    END = "__end__"  # type: ignore


# ──────────────────────────────────────────────────────────────────────────────
# Graph state — TypedDict (LangGraph requires a mapping type)
# ──────────────────────────────────────────────────────────────────────────────

class GraphState(TypedDict, total=False):
    # Inputs
    question: str
    sub_questions: list[str]
    top_k: int
    document_ids: list[str] | None

    # Iteration tracking
    iteration: int
    max_iters: int
    threshold: float

    # Retrieval / generation results
    all_hits: list[DocumentChunkHit]
    answer: str
    faithfulness: bool | None
    verifier_notes: str | None
    steps: list[dict]

    # Outcome flags
    fallback_to_extractive: bool


# ──────────────────────────────────────────────────────────────────────────────
# Public entry-point
# ──────────────────────────────────────────────────────────────────────────────

def run_rag_graph(
    *,
    db: Session,
    user: User,
    question: str,
    chat_session_id: str,
    top_k: int = 6,
    document_ids: list[str] | None = None,
    mode: str = AssistantMode.RAG,
    trace_id: str | None = None,
) -> AgentAnswer:
    """
    LangGraph-driven agentic RAG turn. Drop-in replacement for
    `services.rag_agent.run_rag_agent`.

    Falls back to the legacy implementation if `langgraph` is not installed.
    """
    settings = get_settings()

    # Medical-chat fast path: skip retrieval entirely. Same behaviour as the
    # legacy agent — kept here so callers don't need to special-case modes.
    if mode == AssistantMode.MEDICAL_CHAT:
        answer = _medical_chat(question=question)
        return AgentAnswer(
            answer=answer,
            confidence=65,
            citations=[],
            hits=[],
            model_provider=(settings.assistant_llm_provider or "ollama").lower(),
            model_name=_model_name(_resolve_provider(settings), settings),
            faithfulness_passed=None,
            verifier_notes=None,
        )

    if not LANGGRAPH_AVAILABLE:
        # Graceful degradation: re-import legacy and run it. This keeps
        # development workflows unblocked when langgraph isn't installed yet.
        from app.services.rag_agent import run_rag_agent

        logger.warning("langgraph not installed; using legacy run_rag_agent.")
        return run_rag_agent(
            db=db, user=user, question=question,
            chat_session_id=chat_session_id, top_k=top_k,
            document_ids=document_ids, mode=mode, trace_id=trace_id,
        )

    runner = _RagGraphRunner(
        db=db,
        user=user,
        settings=settings,
        trace_id=trace_id,
    )
    return runner.run(
        question=question,
        top_k=top_k,
        document_ids=document_ids,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Runner — encapsulates per-turn dependencies (db, user, trace_id) so they
# stay out of the checkpointed state. LangGraph serialises the state via the
# checkpointer; we never want to serialise a SQLAlchemy session.
# ──────────────────────────────────────────────────────────────────────────────

class _RagGraphRunner:
    def __init__(
        self,
        *,
        db: Session,
        user: User,
        settings,
        trace_id: str | None,
    ) -> None:
        self.db = db
        self.user = user
        self.settings = settings
        self.trace_id = trace_id
        self.provider = _resolve_provider(settings)
        self._graph = self._build_graph()

    # ── Graph construction ──────────────────────────────────────────────────

    def _build_graph(self):
        graph = StateGraph(GraphState)

        graph.add_node("plan",     self._node_plan)
        graph.add_node("retrieve", self._node_retrieve)
        graph.add_node("score",    self._node_score)
        graph.add_node("generate", self._node_generate)
        graph.add_node("verify",   self._node_verify)

        graph.add_edge(START, "plan")
        graph.add_edge("plan", "retrieve")
        graph.add_edge("retrieve", "score")

        # After scoring: either keep retrieving more (broaden) or move on.
        graph.add_conditional_edges(
            "score",
            self._after_score,
            {"retrieve": "retrieve", "generate": "generate", "end": END},
        )

        # After generating: verify (if enabled) or finish.
        graph.add_conditional_edges(
            "generate",
            self._after_generate,
            {"verify": "verify", "end": END},
        )

        # After verification: regenerate (broader retrieval) or finish.
        graph.add_conditional_edges(
            "verify",
            self._after_verify,
            {"retrieve": "retrieve", "end": END},
        )

        return graph.compile(checkpointer=MemorySaver())

    # ── Public run ──────────────────────────────────────────────────────────

    def run(
        self,
        *,
        question: str,
        top_k: int,
        document_ids: list[str] | None,
    ) -> AgentAnswer:
        sub_questions = (
            _decompose(question, self.settings)
            if self.settings.agentic_enable_query_decomposition
            else [question]
        )

        initial: GraphState = {
            "question":       question,
            "sub_questions":  sub_questions,
            "top_k":          top_k,
            "document_ids":   document_ids,
            "iteration":      0,
            "max_iters":      self.settings.agentic_max_iterations,
            "threshold":      self.settings.agentic_context_score_threshold,
            "all_hits":       [],
            "answer":         "",
            "faithfulness":   None,
            "verifier_notes": None,
            "steps":          [],
            "fallback_to_extractive": False,
        }

        # Each turn gets its own thread_id so the checkpointer namespaces
        # state per-question. trace_id is the natural key when present.
        thread_id = self.trace_id or f"trace-{id(initial)}"
        config = {"configurable": {"thread_id": thread_id}}

        final: GraphState = self._graph.invoke(initial, config=config)  # type: ignore[arg-type]

        return self._finalize(final)

    # ── Nodes ───────────────────────────────────────────────────────────────

    def _node_plan(self, state: GraphState) -> GraphState:
        """No-op-ish node: the decomposition was done in `run()`. We log it
        as the first agent step so the trace shows the planner's output."""
        legacy = self._sync_to_legacy(state)
        _log_step(
            legacy, self.trace_id, self.db, "planner",
            input_j={"question": state["question"]},
            output_j={"subQuestions": state["sub_questions"]},
            elapsed_ms=0,
        )
        state["steps"] = legacy.steps
        return state

    def _node_retrieve(self, state: GraphState) -> GraphState:
        legacy = self._sync_to_legacy(state)
        legacy.iteration += 1

        t0 = time.monotonic()
        new_hits = _retrieve(db=self.db, user=self.user, state=legacy)
        _merge_hits(legacy, new_hits)
        elapsed_ms = int((time.monotonic() - t0) * 1000)

        _log_step(
            legacy, self.trace_id, self.db, "retriever",
            input_j={
                "subQuestions": state["sub_questions"],
                "topK":         state["top_k"],
                "iteration":    legacy.iteration,
            },
            output_j={
                "newHits":   len(new_hits),
                "totalHits": len(legacy.all_hits),
            },
            elapsed_ms=elapsed_ms,
        )

        state["iteration"] = legacy.iteration
        state["all_hits"]  = legacy.all_hits
        state["steps"]     = legacy.steps
        return state

    def _node_score(self, state: GraphState) -> GraphState:
        legacy = self._sync_to_legacy(state)
        ctx_score = _score_context(legacy)
        _log_step(
            legacy, self.trace_id, self.db, "scorer",
            input_j={},
            output_j={"contextScore": ctx_score, "threshold": state["threshold"]},
            elapsed_ms=0,
        )
        state["steps"] = legacy.steps

        # Stash the score in `verifier_notes` slot? No — instead use a
        # private key. We re-use `state` because it's a TypedDict.
        state["_ctx_score"] = ctx_score  # type: ignore[typeddict-unknown-key]
        return state

    def _node_generate(self, state: GraphState) -> GraphState:
        legacy = self._sync_to_legacy(state)

        if self.provider == "none":
            state["answer"] = _extractive_fallback(legacy.all_hits)
            state["faithfulness"] = None
            state["fallback_to_extractive"] = True
            _log_step(
                legacy, self.trace_id, self.db, "generator",
                input_j={"provider": "none"},
                output_j={"fallback": "extractive",
                          "answerLength": len(state["answer"])},
                elapsed_ms=0,
            )
            state["steps"] = legacy.steps
            return state

        t0 = time.monotonic()
        try:
            answer = _generate(
                provider=self.provider,
                settings=self.settings,
                question=state["question"],
                hits=legacy.all_hits,
            )
            state["answer"] = answer
            elapsed_ms = int((time.monotonic() - t0) * 1000)
            _log_step(
                legacy, self.trace_id, self.db, "generator",
                input_j={"provider": self.provider,
                         "contextChunks": len(legacy.all_hits)},
                output_j={"answerLength": len(answer)},
                elapsed_ms=elapsed_ms,
            )
        except Exception as exc:
            logger.exception("Generator failed; falling back to extractive answer.")
            fallback = _extractive_fallback(legacy.all_hits)
            state["answer"] = (
                "AI generation is temporarily unavailable. "
                f"Showing retrieved evidence instead. Provider error: {exc}\n\n"
                f"{fallback}"
            )
            state["faithfulness"]   = None
            state["verifier_notes"] = f"generator_error: {exc}"
            state["fallback_to_extractive"] = True
            _log_step(
                legacy, self.trace_id, self.db, "generator",
                input_j={"provider": self.provider,
                         "contextChunks": len(legacy.all_hits)},
                output_j={"error": str(exc), "fallback": "extractive"},
                elapsed_ms=int((time.monotonic() - t0) * 1000),
            )

        state["steps"] = legacy.steps
        return state

    def _node_verify(self, state: GraphState) -> GraphState:
        if not self.settings.assistant_enable_verifier or self.provider == "none":
            return state
        if state.get("fallback_to_extractive"):
            return state

        legacy = self._sync_to_legacy(state)

        t0 = time.monotonic()
        passed, notes = _verify(
            provider=self.provider,
            settings=self.settings,
            question=state["question"],
            answer=state["answer"],
            hits=legacy.all_hits,
        )
        state["faithfulness"]   = passed
        state["verifier_notes"] = notes
        _log_step(
            legacy, self.trace_id, self.db, "verifier",
            input_j={},
            output_j={"passed": passed, "notes": notes},
            elapsed_ms=int((time.monotonic() - t0) * 1000),
        )
        state["steps"] = legacy.steps
        return state

    # ── Conditional-edge routers ─────────────────────────────────────────────

    def _after_score(self, state: GraphState) -> str:
        score = state.get("_ctx_score", 0.0)  # type: ignore[typeddict-item]
        if score < state["threshold"] and state["iteration"] < state["max_iters"]:
            # Broaden retrieval and loop
            state["top_k"] = min(state["top_k"] * 2, 24)
            state["sub_questions"] = _broaden(state["sub_questions"])
            return "retrieve"
        return "generate"

    def _after_generate(self, state: GraphState) -> str:
        if state.get("fallback_to_extractive"):
            return "end"
        if not self.settings.assistant_enable_verifier or self.provider == "none":
            return "end"
        return "verify"

    def _after_verify(self, state: GraphState) -> str:
        passed = state.get("faithfulness")
        if passed is False and state["iteration"] < state["max_iters"]:
            # Reset to the original question and retry retrieval+generation
            state["sub_questions"] = [state["question"]]
            return "retrieve"
        return "end"

    # ── Bridge between TypedDict GraphState and legacy `_State` dataclass ────

    def _sync_to_legacy(self, state: GraphState) -> _State:
        """
        The helper functions in `rag_agent.py` operate on the legacy `_State`
        dataclass. Wrap the TypedDict in one so we can keep reusing them.
        """
        return _State(
            question=state["question"],
            sub_questions=list(state.get("sub_questions") or []),
            iteration=state.get("iteration", 0),
            all_hits=list(state.get("all_hits") or []),
            answer=state.get("answer") or "",
            faithfulness=state.get("faithfulness"),
            verifier_notes=state.get("verifier_notes"),
            stop=False,
            steps=list(state.get("steps") or []),
            top_k=state.get("top_k", 6),
            document_ids=state.get("document_ids"),
        )

    # ── Final assembly ───────────────────────────────────────────────────────

    def _finalize(self, state: GraphState) -> AgentAnswer:
        legacy = self._sync_to_legacy(state)

        if not legacy.answer:
            legacy.answer = _extractive_fallback(legacy.all_hits)
        if not legacy.all_hits:
            legacy.answer = (
                "I could not find indexed material matching that question. "
                "Upload a document (or wait for ingestion to complete), then try again."
            )

        return AgentAnswer(
            answer=legacy.answer,
            confidence=_compute_confidence(legacy),
            citations=_build_citations(legacy.all_hits),
            hits=legacy.all_hits,
            model_provider=self.provider,
            model_name=_model_name(self.provider, self.settings),
            faithfulness_passed=state.get("faithfulness"),
            verifier_notes=state.get("verifier_notes"),
            reasoning_steps=legacy.steps,
            iterations=legacy.iteration,
        )
