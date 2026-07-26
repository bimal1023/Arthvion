"""Deal Stage Pipeline — stage constants and request/response schemas."""
from __future__ import annotations

from pydantic import BaseModel

# CRM activity kinds logged against a deal (the deal's activity timeline).
INTERACTION_KINDS: list[str] = ["note", "call", "email", "meeting", "task"]
VALID_INTERACTION_KINDS = set(INTERACTION_KINDS)

# Ordered funnel. The first five are active stages; the last two are terminal.
PIPELINE_STAGES: list[str] = [
    "sourced",
    "screening",
    "diligence",
    "ic_review",
    "closing",
    "won",
    "passed",
]
VALID_STAGES = set(PIPELINE_STAGES)
VALID_CONVICTION = {"high", "medium", "low"}


class CreateDealRequest(BaseModel):
    company: str
    ticker: str | None = None
    report_id: str | None = None
    stage: str = "sourced"
    deal_size_usd: float | None = None
    conviction: str | None = None
    notes: str = ""


class UpdateDealRequest(BaseModel):
    company: str | None = None
    ticker: str | None = None
    report_id: str | None = None
    stage: str | None = None
    position: int | None = None
    deal_size_usd: float | None = None
    conviction: str | None = None
    notes: str | None = None


class DealOut(BaseModel):
    id: str
    company: str
    ticker: str | None
    report_id: str | None
    # Status of the linked report, surfaced so the pipeline card can render
    # Deep Dive running/ready state without any client-side memory:
    # null (no report) | "pending" | "running" | "complete" | "error".
    report_status: str | None = None
    stage: str
    position: int
    deal_size_usd: float | None
    conviction: str | None
    notes: str
    stage_updated_at: str
    created_at: str
    updated_at: str


# ── CRM interactions (deal activity timeline) ─────────────────────────────────

class CreateInteractionRequest(BaseModel):
    kind: str = "note"
    body: str = ""
    # ISO 8601; task-only. When set on kind="task" it drives the due indicator.
    due_at: str | None = None


class UpdateInteractionRequest(BaseModel):
    body: str | None = None
    due_at: str | None = None
    # Toggle a task's completion. True → stamp completed_at; False → clear it.
    completed: bool | None = None


class InteractionOut(BaseModel):
    id: str
    deal_id: str
    kind: str
    body: str
    actor_name: str
    occurred_at: str
    due_at: str | None = None
    completed_at: str | None = None
    created_at: str
