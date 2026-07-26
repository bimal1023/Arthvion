"""Screening memo schemas — the AI go/no-go opinion generated from a deal record."""
from __future__ import annotations

from pydantic import BaseModel, Field

VALID_RECOMMENDATIONS = {"pursue", "hold", "pass"}


class ScreeningResult(BaseModel):
    """Structured output parsed from the screening LLM call."""
    recommendation: str = "hold"
    thesis_fit_score: int | None = Field(default=None, ge=0, le=100)
    summary: str = ""
    strengths: list[str] = []
    concerns: list[str] = []
    next_step: str = ""


class ScreeningMemoOut(BaseModel):
    """API shape for a persisted screening memo."""
    id: str
    deal_id: str
    recommendation: str
    thesis_fit_score: int | None = None
    summary: str
    strengths: list[str] = []
    concerns: list[str] = []
    next_step: str = ""
    # {report_linked: bool, interaction_count: int}
    grounded_on: dict = {}
    created_at: str
