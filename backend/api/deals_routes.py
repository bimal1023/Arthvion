"""Deal Stage Pipeline routes — track companies through the diligence funnel."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.activity import log_activity
from backend.core.database import get_session
from backend.core.rate_limit import limiter
from backend.core.workspace import WorkspaceContext, get_workspace_context, require_role
from backend.models.db import Deal, Interaction, ReportRecord, ScreeningMemo, User, Workspace
from backend.models.deals import (
    CreateDealRequest,
    CreateInteractionRequest,
    DealOut,
    InteractionOut,
    UpdateDealRequest,
    UpdateInteractionRequest,
    VALID_CONVICTION,
    VALID_INTERACTION_KINDS,
    VALID_STAGES,
)
from backend.models.screening import ScreeningMemoOut

logger = logging.getLogger(__name__)
router = APIRouter(tags=["deals"])


# ── Helpers ──────────────────────────────────────────────────────────────────

def _out(d: Deal, report_status: str | None = None) -> DealOut:
    return DealOut(
        id=str(d.id),
        company=d.company,
        ticker=d.ticker,
        report_id=str(d.report_id) if d.report_id else None,
        report_status=report_status,
        stage=d.stage,
        position=d.position,
        deal_size_usd=d.deal_size_usd,
        conviction=d.conviction,
        notes=d.notes or "",
        stage_updated_at=d.stage_updated_at.isoformat() if d.stage_updated_at else "",
        created_at=d.created_at.isoformat() if d.created_at else "",
        updated_at=d.updated_at.isoformat() if d.updated_at else "",
    )


async def _report_status(report_id: UUID | None, db: AsyncSession) -> str | None:
    if report_id is None:
        return None
    rec = await db.get(ReportRecord, report_id)
    return rec.status if rec else None


async def _validate_report(report_id: str | None, ctx: WorkspaceContext, db: AsyncSession) -> UUID | None:
    """Resolve a report_id string to a UUID owned by the workspace, or None."""
    if not report_id:
        return None
    try:
        rid = UUID(report_id)
    except ValueError:
        raise HTTPException(400, "Invalid report_id")
    record = await db.get(ReportRecord, rid)
    if record is None or record.workspace_id != ctx.workspace.id:
        raise HTTPException(404, "Linked report not found")
    return rid


async def _next_position(stage: str, ctx: WorkspaceContext, db: AsyncSession) -> int:
    """Append new cards to the bottom of their stage column."""
    result = await db.execute(
        select(func.max(Deal.position)).where(
            Deal.workspace_id == ctx.workspace.id, Deal.stage == stage
        )
    )
    top = result.scalar()
    return (top + 1) if top is not None else 0


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/deals")
async def list_deals(
    ctx: WorkspaceContext = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_session),
) -> list[DealOut]:
    result = await db.execute(
        select(Deal).where(Deal.workspace_id == ctx.workspace.id).order_by(Deal.position, Deal.created_at)
    )
    deals = list(result.scalars().all())

    # Batch-fetch linked report statuses in one query so cards can render the
    # Deep Dive running/ready state without N round-trips.
    rids = {d.report_id for d in deals if d.report_id}
    statuses: dict[UUID, str] = {}
    if rids:
        rows = await db.execute(
            select(ReportRecord.id, ReportRecord.status).where(ReportRecord.id.in_(rids))
        )
        statuses = {rid: status for rid, status in rows.all()}

    return [_out(d, statuses.get(d.report_id) if d.report_id else None) for d in deals]


@router.post("/deals", status_code=201)
async def create_deal(
    body: CreateDealRequest,
    ctx: WorkspaceContext = Depends(require_role("admin", "analyst")),
    db: AsyncSession = Depends(get_session),
) -> DealOut:
    company = body.company.strip()
    if not company:
        raise HTTPException(400, "Company is required.")

    stage = (body.stage or "sourced").strip().lower()
    if stage not in VALID_STAGES:
        stage = "sourced"
    conviction = (body.conviction or "").strip().lower() or None
    if conviction is not None and conviction not in VALID_CONVICTION:
        conviction = None

    rid = await _validate_report(body.report_id, ctx, db)

    row = Deal(
        user_id=ctx.user.id,
        workspace_id=ctx.workspace.id,
        company=company[:255],
        ticker=(body.ticker or "").strip()[:20] or None,
        report_id=rid,
        stage=stage,
        position=await _next_position(stage, ctx, db),
        deal_size_usd=body.deal_size_usd,
        conviction=conviction,
        notes=body.notes or "",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)

    # Log activity
    await log_activity(
        db=db,
        workspace_id=ctx.workspace.id,
        actor_user_id=ctx.user.id,
        event_type="deal_created",
        summary=f"{ctx.user.full_name or ctx.user.email} added {company} to the pipeline",
        details={"deal_id": str(row.id), "company": company, "stage": stage},
    )
    await db.commit()

    return _out(row, await _report_status(row.report_id, db))


@router.post("/deals/{deal_id}/deep-dive", status_code=202)
@limiter.limit("10/hour")
async def deep_dive(
    request: Request,
    deal_id: UUID,
    ctx: WorkspaceContext = Depends(require_role("admin", "analyst")),
    db: AsyncSession = Depends(get_session),
) -> DealOut:
    """Launch a full 4-agent due-diligence run for a deal, link it, and advance
    the card to the Diligence stage.

    Mirrors the report cache + credit gate from `create_report`:
      * cache hit  → links the existing complete report, free, no agents run
      * already linked & complete/running → idempotent no-op
      * otherwise  → 1 credit, dispatch Celery `run_report`

    When the report finishes, the Celery completion hook auto-generates the
    deal's Action Queue, so results persist even if the user navigates away.
    """
    from datetime import timedelta

    from backend.core.config import get_settings
    from backend.models.report import ReportRequest
    from backend.tasks.report_task import run_report

    row = await db.get(Deal, deal_id)
    if row is None or row.workspace_id != ctx.workspace.id:
        raise HTTPException(404, "Deal not found")

    # ── Idempotency — don't re-run if a usable report is already attached ──
    if row.report_id:
        existing = await db.get(ReportRecord, row.report_id)
        if existing and existing.status in ("pending", "running", "complete"):
            return _out(row, existing.status)

    company = row.company
    ticker = row.ticker

    def _advance(record_id: UUID) -> None:
        row.report_id = record_id
        if row.stage in ("sourced", "screening"):
            row.stage = "diligence"
            row.stage_updated_at = datetime.now(timezone.utc)

    # ── Cache lookup — reuse a recent complete report for the same company ──
    settings = get_settings()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.report_cache_ttl_hours)
    cached = await db.execute(
        select(ReportRecord)
        .where(
            ReportRecord.workspace_id == ctx.workspace.id,
            ReportRecord.company == company,
            ReportRecord.status == "complete",
            ReportRecord.created_at >= cutoff,
        )
        .order_by(ReportRecord.created_at.desc())
        .limit(1)
    )
    hit = cached.scalar_one_or_none()
    if hit is not None and hit.data:
        _advance(hit.id)
        await db.commit()
        await db.refresh(row)
        # Generate the action queue inline for the cache-hit case (no Celery run).
        try:
            from sqlalchemy import delete

            from backend.models.db import DealAction
            from backend.services.action_generator import generate_actions
            generated = await generate_actions(hit.data)
            if generated:
                await db.execute(delete(DealAction).where(
                    DealAction.report_id == hit.id,
                    DealAction.workspace_id == ctx.workspace.id,
                    DealAction.origin == "auto",
                ))
                for g in generated:
                    db.add(DealAction(
                        user_id=ctx.user.id, workspace_id=ctx.workspace.id,
                        report_id=hit.id, title=g.title[:255],
                        description=g.description, category=g.category,
                        priority=g.priority, rationale=g.rationale, origin="auto",
                    ))
                await db.commit()
        except Exception:
            logger.exception("Deep Dive cache-hit action generation failed for deal %s", deal_id)
        return _out(row, "complete")

    # ── No cache — atomically decrement credits at SQL level ────────────────
    ws = ctx.workspace
    result = await db.execute(
        update(Workspace)
        .where(Workspace.id == ws.id, Workspace.memo_credits > 0)
        .values(memo_credits=Workspace.memo_credits - 1)
    )
    if result.rowcount == 0:
        raise HTTPException(
            402,
            "Out of memo credits. Upgrade to Desk for 50 memos/month, "
            "or wait for your next billing cycle.",
        )

    record = ReportRecord(
        user_id=ctx.user.id, workspace_id=ctx.workspace.id,
        company=company, ticker=ticker, status="pending",
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    req = ReportRequest(company_name=company, ticker=ticker)
    task = run_report.delay(str(record.id), req.model_dump())
    record.celery_task_id = task.id
    _advance(record.id)
    await db.commit()
    await db.refresh(row)

    return _out(row, "pending")


@router.patch("/deals/{deal_id}")
async def update_deal(
    deal_id: UUID,
    body: UpdateDealRequest,
    ctx: WorkspaceContext = Depends(require_role("admin", "analyst")),
    db: AsyncSession = Depends(get_session),
) -> DealOut:
    row = await db.get(Deal, deal_id)
    if row is None or row.workspace_id != ctx.workspace.id:
        raise HTTPException(404, "Deal not found")

    old_stage = row.stage
    if body.stage is not None:
        stage = body.stage.strip().lower()
        if stage not in VALID_STAGES:
            raise HTTPException(400, f"Invalid stage. Valid: {sorted(VALID_STAGES)}")
        if stage != row.stage:
            row.stage = stage
            row.stage_updated_at = datetime.now(timezone.utc)
            # When moved to a new column without an explicit position, drop to bottom.
            if body.position is None:
                row.position = await _next_position(stage, ctx, db)
    if body.position is not None:
        row.position = body.position
    if body.company is not None and body.company.strip():
        row.company = body.company.strip()[:255]
    if body.ticker is not None:
        row.ticker = body.ticker.strip()[:20] or None
    if body.report_id is not None:
        row.report_id = await _validate_report(body.report_id, ctx, db)
    if body.deal_size_usd is not None:
        row.deal_size_usd = body.deal_size_usd
    if body.conviction is not None:
        c = body.conviction.strip().lower()
        row.conviction = c if c in VALID_CONVICTION else None
    if body.notes is not None:
        row.notes = body.notes

    await db.commit()
    await db.refresh(row)

    # Log stage change activity
    if row.stage != old_stage:
        await log_activity(
            db=db,
            workspace_id=ctx.workspace.id,
            actor_user_id=ctx.user.id,
            event_type="deal_stage_changed",
            summary=f"{ctx.user.full_name or ctx.user.email} moved {row.company} from {old_stage} to {row.stage}",
            details={"deal_id": str(row.id), "from": old_stage, "to": row.stage},
        )
        await db.commit()

    return _out(row, await _report_status(row.report_id, db))


@router.delete("/deals/{deal_id}", status_code=204)
async def delete_deal(
    deal_id: UUID,
    ctx: WorkspaceContext = Depends(require_role("admin", "analyst")),
    db: AsyncSession = Depends(get_session),
) -> None:
    row = await db.get(Deal, deal_id)
    if row is None or row.workspace_id != ctx.workspace.id:
        raise HTTPException(404, "Deal not found")
    company = row.company
    await db.delete(row)
    await db.commit()

    await log_activity(
        db=db,
        workspace_id=ctx.workspace.id,
        actor_user_id=ctx.user.id,
        event_type="deal_deleted",
        summary=f"{ctx.user.full_name or ctx.user.email} removed {company} from the pipeline",
        details={"deal_id": str(deal_id), "company": company},
    )
    await db.commit()


# ── CRM interactions (deal activity timeline) ─────────────────────────────────

def _parse_dt(value: str | None) -> datetime | None:
    """Parse an ISO 8601 string (accepting a trailing 'Z') to an aware datetime."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(400, "Invalid datetime — expected ISO 8601.")


def _interaction_out(i: Interaction, actor_name: str) -> InteractionOut:
    return InteractionOut(
        id=str(i.id),
        deal_id=str(i.deal_id),
        kind=i.kind,
        body=i.body or "",
        actor_name=actor_name,
        occurred_at=i.occurred_at.isoformat() if i.occurred_at else "",
        due_at=i.due_at.isoformat() if i.due_at else None,
        completed_at=i.completed_at.isoformat() if i.completed_at else None,
        created_at=i.created_at.isoformat() if i.created_at else "",
    )


async def _get_owned_deal(deal_id: UUID, ctx: WorkspaceContext, db: AsyncSession) -> Deal:
    row = await db.get(Deal, deal_id)
    if row is None or row.workspace_id != ctx.workspace.id:
        raise HTTPException(404, "Deal not found")
    return row


@router.get("/deals/{deal_id}/interactions")
async def list_interactions(
    deal_id: UUID,
    ctx: WorkspaceContext = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_session),
) -> list[InteractionOut]:
    await _get_owned_deal(deal_id, ctx, db)
    result = await db.execute(
        select(Interaction, User.full_name, User.email)
        .join(User, Interaction.user_id == User.id)
        .where(Interaction.deal_id == deal_id)
        .order_by(Interaction.occurred_at.desc())
    )
    return [
        _interaction_out(i, full_name or email)
        for i, full_name, email in result.all()
    ]


@router.post("/deals/{deal_id}/interactions", status_code=201)
async def create_interaction(
    deal_id: UUID,
    body: CreateInteractionRequest,
    ctx: WorkspaceContext = Depends(require_role("admin", "analyst")),
    db: AsyncSession = Depends(get_session),
) -> InteractionOut:
    await _get_owned_deal(deal_id, ctx, db)

    kind = (body.kind or "note").strip().lower()
    if kind not in VALID_INTERACTION_KINDS:
        raise HTTPException(400, f"Invalid kind. Valid: {sorted(VALID_INTERACTION_KINDS)}")

    text = (body.body or "").strip()
    if not text:
        raise HTTPException(400, "Interaction body is required.")

    row = Interaction(
        user_id=ctx.user.id,
        workspace_id=ctx.workspace.id,
        deal_id=deal_id,
        kind=kind,
        body=text,
        due_at=_parse_dt(body.due_at) if kind == "task" else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _interaction_out(row, ctx.user.full_name or ctx.user.email)


@router.patch("/interactions/{interaction_id}")
async def update_interaction(
    interaction_id: UUID,
    body: UpdateInteractionRequest,
    ctx: WorkspaceContext = Depends(require_role("admin", "analyst")),
    db: AsyncSession = Depends(get_session),
) -> InteractionOut:
    row = await db.get(Interaction, interaction_id)
    if row is None or row.workspace_id != ctx.workspace.id:
        raise HTTPException(404, "Interaction not found")

    if body.body is not None:
        text = body.body.strip()
        if not text:
            raise HTTPException(400, "Interaction body cannot be empty.")
        row.body = text
    if body.due_at is not None:
        row.due_at = _parse_dt(body.due_at)
    if body.completed is not None:
        row.completed_at = datetime.now(timezone.utc) if body.completed else None

    await db.commit()
    await db.refresh(row)

    actor = await db.get(User, row.user_id)
    actor_name = (actor.full_name or actor.email) if actor else ""
    return _interaction_out(row, actor_name)


@router.delete("/interactions/{interaction_id}", status_code=204)
async def delete_interaction(
    interaction_id: UUID,
    ctx: WorkspaceContext = Depends(require_role("admin", "analyst")),
    db: AsyncSession = Depends(get_session),
) -> None:
    row = await db.get(Interaction, interaction_id)
    if row is None or row.workspace_id != ctx.workspace.id:
        raise HTTPException(404, "Interaction not found")
    await db.delete(row)
    await db.commit()


# ── AI screening (go/no-go opinion grounded in the deal record) ───────────────

def _screening_out(memo: ScreeningMemo) -> ScreeningMemoOut:
    data = memo.data or {}
    return ScreeningMemoOut(
        id=str(memo.id),
        deal_id=str(memo.deal_id),
        recommendation=memo.recommendation,
        thesis_fit_score=memo.thesis_fit_score,
        summary=memo.summary or "",
        strengths=data.get("strengths", []),
        concerns=data.get("concerns", []),
        next_step=data.get("next_step", ""),
        grounded_on=data.get("grounded_on", {}),
        created_at=memo.created_at.isoformat() if memo.created_at else "",
    )


@router.get("/deals/{deal_id}/screening")
async def get_screening(
    deal_id: UUID,
    ctx: WorkspaceContext = Depends(get_workspace_context),
    db: AsyncSession = Depends(get_session),
) -> ScreeningMemoOut | None:
    """Return the latest screening memo for a deal, or null if none yet."""
    await _get_owned_deal(deal_id, ctx, db)
    result = await db.execute(
        select(ScreeningMemo)
        .where(ScreeningMemo.deal_id == deal_id)
        .order_by(ScreeningMemo.created_at.desc())
        .limit(1)
    )
    memo = result.scalar_one_or_none()
    return _screening_out(memo) if memo else None


@router.post("/deals/{deal_id}/screen", status_code=201)
@limiter.limit("30/hour")
async def screen_deal(
    request: Request,
    deal_id: UUID,
    ctx: WorkspaceContext = Depends(require_role("admin", "analyst")),
    db: AsyncSession = Depends(get_session),
) -> ScreeningMemoOut:
    """Generate a fast AI go/no-go screen grounded in the deal's context.

    Unlike Deep Dive, this runs no agents and costs no memo credit — it's a
    single grounded synthesis over the deal fields, its activity timeline, and
    any linked diligence report.
    """
    from backend.services.screening import generate_screening

    deal = await _get_owned_deal(deal_id, ctx, db)

    # Gather the activity timeline (most recent first).
    rows = await db.execute(
        select(Interaction)
        .where(Interaction.deal_id == deal_id)
        .order_by(Interaction.occurred_at.desc())
    )
    interactions = [
        {
            "kind": i.kind,
            "body": i.body,
            "occurred_at": i.occurred_at.isoformat() if i.occurred_at else "",
            "due_at": i.due_at.isoformat() if i.due_at else None,
            "completed": i.completed_at is not None,
        }
        for i in rows.scalars().all()
    ]

    # Pull the linked report's data if a Deep Dive has completed.
    report_data: dict | None = None
    if deal.report_id:
        rec = await db.get(ReportRecord, deal.report_id)
        if rec and rec.status == "complete" and rec.data:
            report_data = rec.data

    try:
        result = await generate_screening(
            company=deal.company,
            ticker=deal.ticker,
            stage=deal.stage,
            deal_size_usd=deal.deal_size_usd,
            conviction=deal.conviction,
            notes=deal.notes or "",
            interactions=interactions,
            report_data=report_data,
        )
    except Exception:
        logger.exception("Screening generation failed for deal %s", deal_id)
        raise HTTPException(502, "Screening could not be generated. Please try again.")

    memo = ScreeningMemo(
        user_id=ctx.user.id,
        workspace_id=ctx.workspace.id,
        deal_id=deal_id,
        recommendation=result.recommendation,
        thesis_fit_score=result.thesis_fit_score,
        summary=result.summary,
        data={
            "strengths": result.strengths,
            "concerns": result.concerns,
            "next_step": result.next_step,
            "grounded_on": {
                "report_linked": report_data is not None,
                "interaction_count": len(interactions),
            },
        },
    )
    db.add(memo)
    await db.commit()
    await db.refresh(memo)
    return _screening_out(memo)
