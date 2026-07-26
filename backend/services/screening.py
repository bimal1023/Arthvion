"""
AI deal screening.

Generates a fast go/no-go opinion on a pipeline deal — NOT a full 4-agent Deep
Dive. It's a single Claude call grounded in what the team already knows: the
deal's fields, its activity timeline (notes/calls/tasks), and any linked
diligence report. This is the differentiator the activity timeline feeds:
the CRM knows the context, so the screen writes itself.
"""
from __future__ import annotations

import json
import logging
import re

from backend.core.config import get_settings
from backend.core.llm import make_client
from backend.models.screening import ScreeningResult, VALID_RECOMMENDATIONS

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a senior partner at a private-equity firm making a fast SCREENING call
on a deal — the go/no-go decision before committing diligence resources. You are
given everything the team currently knows: the deal record, the activity
timeline (calls, notes, tasks), and — if one exists — a prior diligence report.

Your job: a crisp, defensible recommendation. Reason ONLY from the provided
context. Do not invent facts. If the context is thin, say so and lower the
thesis-fit score accordingly — a screen on little information is a "hold", not a
confident "pursue".

## Output format — output ONLY a valid JSON object, no markdown fences:
{
  "recommendation": "<pursue | hold | pass>",
  "thesis_fit_score": <integer 0-100, or null if there is too little to judge>,
  "summary": "<2-3 sentences: the decision and the single most important reason>",
  "strengths": ["<what supports pursuing — grounded in the context>", ...],
  "concerns": ["<what argues against / must be diligenced next>", ...],
  "next_step": "<the one concrete action to take now>"
}

## Rules
- "pursue" = worth committing diligence resources. "pass" = decline now.
  "hold" = need a specific missing input before deciding.
- 2-5 strengths and 2-5 concerns. Be specific; reference the actual context.
- thesis_fit_score reflects fit + conviction given the evidence, not optimism.
- next_step must be a single concrete action (e.g. "Request FY24 audited
  financials to verify the $2B revenue claim"), never generic advice.
- Output ONLY the JSON object.
"""


def _build_context(
    *,
    company: str,
    ticker: str | None,
    stage: str,
    deal_size_usd: float | None,
    conviction: str | None,
    notes: str,
    interactions: list[dict],
    report_data: dict | None,
) -> str:
    parts: list[str] = []
    header = f"Company: {company}" + (f" ({ticker})" if ticker else "")
    parts.append(header)
    parts.append(f"Pipeline stage: {stage}")
    if deal_size_usd:
        parts.append(f"Estimated deal size: ${deal_size_usd:,.0f}")
    if conviction:
        parts.append(f"Analyst conviction: {conviction}")
    if notes and notes.strip():
        parts.append(f"\nDeal notes:\n{notes.strip()}")

    if interactions:
        parts.append("\n## Activity timeline (most recent first)")
        for it in interactions[:30]:
            kind = it.get("kind", "note")
            body = (it.get("body") or "").strip()
            when = (it.get("occurred_at") or "")[:10]
            line = f"- [{kind}] {body}"
            if when:
                line += f" ({when})"
            if kind == "task":
                line += " — DONE" if it.get("completed") else " — OPEN"
                if it.get("due_at"):
                    line += f", due {it['due_at'][:10]}"
            parts.append(line)
    else:
        parts.append("\n## Activity timeline\n(No activity logged yet.)")

    if isinstance(report_data, dict):
        parts.append("\n## Linked diligence report")
        if report_data.get("overall_score") is not None:
            parts.append(f"Overall diligence score: {report_data['overall_score']}/10")
        if report_data.get("executive_summary"):
            parts.append(f"Executive summary:\n{report_data['executive_summary']}")
        risk = report_data.get("risk")
        if isinstance(risk, dict):
            for r in (risk.get("risks") or [])[:6]:
                parts.append(f"- Risk [{r.get('severity', '?')}]: {r.get('title', '')}")
    else:
        parts.append("\n## Linked diligence report\n(None — no Deep Dive has been run yet.)")

    return "\n".join(parts)[:8000]


def _parse(text: str) -> ScreeningResult:
    try:
        text = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
        text = re.sub(r"\s*```$", "", text.strip(), flags=re.MULTILINE)
        start = text.find("{")
        if start != -1:
            depth = 0
            for i, ch in enumerate(text[start:], start):
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        text = text[start : i + 1]
                        break
        result = ScreeningResult.model_validate(json.loads(text, strict=False))
        if result.recommendation not in VALID_RECOMMENDATIONS:
            result.recommendation = "hold"
        return result
    except Exception as exc:
        logger.warning("Could not parse screening JSON: %s", exc)
        return ScreeningResult(
            recommendation="hold",
            summary="Screening could not be completed automatically. Review the deal manually.",
        )


async def generate_screening(
    *,
    company: str,
    ticker: str | None = None,
    stage: str = "sourced",
    deal_size_usd: float | None = None,
    conviction: str | None = None,
    notes: str = "",
    interactions: list[dict] | None = None,
    report_data: dict | None = None,
) -> ScreeningResult:
    """Produce a go/no-go screening opinion grounded in the deal's context."""
    settings = get_settings()
    context = _build_context(
        company=company,
        ticker=ticker,
        stage=stage,
        deal_size_usd=deal_size_usd,
        conviction=conviction,
        notes=notes,
        interactions=interactions or [],
        report_data=report_data,
    )

    client = make_client()
    response = await client.messages.create(
        model=settings.fast_model,
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"Screen this deal and return the JSON verdict:\n\n{context}",
        }],
    )
    text = response.content[0].text if response.content else ""
    return _parse(text)
