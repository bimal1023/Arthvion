"""Platform-admin endpoints — user overview, credit grants, vouchers.

Mounted at /api/v1/admin/* by backend.main. Every route is gated by
`require_admin`, which checks the caller's email against
`settings.admin_emails` (comma-separated env var, default admin@arthvion.com).
"""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.auth import get_current_user
from backend.core.config import get_settings
from backend.core.database import get_session
from backend.core.rate_limit import limiter
from backend.services.billing import PLAN_CREDITS
from backend.models.db import (
    CreditLog,
    ReportRecord,
    User,
    Voucher,
    VoucherRedemption,
    Workspace,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


# ── Guard ─────────────────────────────────────────────────────────────────────

async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """403 unless the authenticated user's email is in ADMIN_EMAILS."""
    settings = get_settings()
    if current_user.email.lower() not in settings.admin_email_list:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


# ── Response models ───────────────────────────────────────────────────────────

class AdminUserRow(BaseModel):
    id: str
    email: str
    full_name: str | None
    is_verified: bool
    created_at: datetime | None
    plan_tier: str
    memo_credits: int
    workspace_id: str | None
    workspace_name: str | None
    subscription_status: str | None
    reports_total: int
    reports_30d: int
    last_report_at: datetime | None


class AdminOverview(BaseModel):
    total_users: int
    verified_users: int
    plan_counts: dict[str, int]
    reports_total: int
    reports_30d: int
    credits_used_30d: int


class GrantCreditsRequest(BaseModel):
    credits: int = Field(ge=1, le=10_000)
    note: str | None = Field(default=None, max_length=255)


class SetPlanRequest(BaseModel):
    plan_tier: Literal["solo", "desk", "firm"]
    # None → refill to the tier's standard allowance. Pass an explicit number
    # to comp a custom amount (Firm is "custom" by design).
    credits: int | None = Field(default=None, ge=0, le=1_000_000)
    # A workspace on a live Stripe subscription will have any manual tier change
    # overwritten by the next subscription webhook. Refuse unless forced.
    force: bool = False
    note: str | None = Field(default=None, max_length=255)


class SetPlanResponse(BaseModel):
    detail: str
    user_id: str
    email: str
    workspace_id: str | None
    plan_tier: str
    memo_credits: int
    subscription_status: str | None


class CreateVoucherRequest(BaseModel):
    credits: int = Field(ge=1, le=10_000)
    max_redemptions: int = Field(default=1, ge=1, le=100_000)
    expires_in_days: int | None = Field(default=None, ge=1, le=3650)
    code: str | None = Field(default=None, min_length=4, max_length=40)
    note: str | None = Field(default=None, max_length=255)


class VoucherRow(BaseModel):
    id: str
    code: str
    credits: int
    max_redemptions: int
    redeemed_count: int
    expires_at: datetime | None
    note: str | None
    created_at: datetime | None


# ── Overview ──────────────────────────────────────────────────────────────────

@router.get("/overview", response_model=AdminOverview)
async def overview(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
) -> AdminOverview:
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)

    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    verified_users = (
        await db.execute(select(func.count(User.id)).where(User.is_verified.is_(True)))
    ).scalar_one()

    plan_rows = (
        await db.execute(
            select(Workspace.plan_tier, func.count(Workspace.id)).group_by(Workspace.plan_tier)
        )
    ).all()
    plan_counts = {tier: count for tier, count in plan_rows}

    reports_total = (await db.execute(select(func.count(ReportRecord.id)))).scalar_one()
    reports_30d = (
        await db.execute(
            select(func.count(ReportRecord.id)).where(ReportRecord.created_at >= month_ago)
        )
    ).scalar_one()

    credits_used_30d = (
        await db.execute(
            select(func.coalesce(func.sum(-CreditLog.delta), 0)).where(
                CreditLog.action == "report_run",
                CreditLog.created_at >= month_ago,
            )
        )
    ).scalar_one()

    return AdminOverview(
        total_users=total_users,
        verified_users=verified_users,
        plan_counts=plan_counts,
        reports_total=reports_total,
        reports_30d=reports_30d,
        credits_used_30d=int(credits_used_30d),
    )


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[AdminUserRow])
async def list_users(
    search: str | None = None,
    limit: int = 200,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
) -> list[AdminUserRow]:
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    limit = max(1, min(limit, 500))

    stmt = select(User).order_by(User.created_at.desc()).limit(limit)
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(User.email.ilike(like) | User.full_name.ilike(like))
    users = (await db.execute(stmt)).scalars().all()
    if not users:
        return []

    user_ids = [u.id for u in users]

    # Per-user memo counts in two grouped queries (fine at admin scale)
    totals = dict(
        (
            await db.execute(
                select(ReportRecord.user_id, func.count(ReportRecord.id))
                .where(ReportRecord.user_id.in_(user_ids))
                .group_by(ReportRecord.user_id)
            )
        ).all()
    )
    recent = dict(
        (
            await db.execute(
                select(ReportRecord.user_id, func.count(ReportRecord.id))
                .where(
                    ReportRecord.user_id.in_(user_ids),
                    ReportRecord.created_at >= month_ago,
                )
                .group_by(ReportRecord.user_id)
            )
        ).all()
    )
    last_at = dict(
        (
            await db.execute(
                select(ReportRecord.user_id, func.max(ReportRecord.created_at))
                .where(ReportRecord.user_id.in_(user_ids))
                .group_by(ReportRecord.user_id)
            )
        ).all()
    )

    ws_ids = [u.active_workspace_id for u in users if u.active_workspace_id]
    workspaces: dict = {}
    if ws_ids:
        for ws in (
            (await db.execute(select(Workspace).where(Workspace.id.in_(ws_ids)))).scalars().all()
        ):
            workspaces[ws.id] = ws

    rows: list[AdminUserRow] = []
    for u in users:
        ws = workspaces.get(u.active_workspace_id)
        rows.append(
            AdminUserRow(
                id=str(u.id),
                email=u.email,
                full_name=u.full_name,
                is_verified=u.is_verified,
                created_at=u.created_at,
                plan_tier=(ws.plan_tier if ws else u.plan_tier) or "solo",
                memo_credits=ws.memo_credits if ws else u.memo_credits,
                workspace_id=str(ws.id) if ws else None,
                workspace_name=ws.name if ws else None,
                subscription_status=(ws.subscription_status if ws else u.subscription_status),
                reports_total=int(totals.get(u.id, 0)),
                reports_30d=int(recent.get(u.id, 0)),
                last_report_at=last_at.get(u.id),
            )
        )
    return rows


@router.post("/users/{user_id}/credits")
@limiter.limit("60/hour")
async def grant_credits(
    request: Request,
    user_id: str,
    body: GrantCreditsRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """Manually add memo credits to a user's active workspace."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    ws = await db.get(Workspace, user.active_workspace_id) if user.active_workspace_id else None
    if ws:
        ws.memo_credits += body.credits
        db.add(
            CreditLog(
                workspace_id=ws.id,
                user_id=user.id,
                action="credit_add",
                delta=body.credits,
            )
        )
        new_balance = ws.memo_credits
    else:
        # Legacy account with no workspace — credit the user row directly
        user.memo_credits += body.credits
        new_balance = user.memo_credits

    await db.commit()
    logger.info(
        "ADMIN %s granted %d credits to %s (note=%s)",
        admin.email, body.credits, user.email, body.note,
    )
    return {"detail": f"Added {body.credits} credits.", "memo_credits": new_balance}


@router.post("/users/{user_id}/plan", response_model=SetPlanResponse)
@limiter.limit("60/hour")
async def set_plan(
    request: Request,
    user_id: str,
    body: SetPlanRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
) -> SetPlanResponse:
    """Move a user's workspace onto a plan tier without taking payment.

    For comped accounts, design partners, and support fixes. Stripe is never
    called: the workspace is marked `subscription_status="comped"` so it stays
    distinguishable from a paying customer — that matters because a comped
    workspace has no `stripe_customer_id`, so anything that would open the
    billing portal must not treat it as a live subscription.
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    ws = await db.get(Workspace, user.active_workspace_id) if user.active_workspace_id else None
    if not ws:
        raise HTTPException(
            status_code=400,
            detail=(
                "User has no active workspace, and plan tier lives on the workspace. "
                "Use the credits endpoint to top up a legacy account instead."
            ),
        )

    # Stripe is the source of truth while a subscription is live — a manual
    # change here would be silently reverted by the next subscription webhook.
    if ws.stripe_subscription_id and not body.force:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Workspace has a live Stripe subscription ({ws.subscription_status}). "
                "A manual tier change will be overwritten by the next Stripe webhook. "
                "Cancel the subscription first, or resend with force=true."
            ),
        )

    old_tier = ws.plan_tier or "solo"
    old_credits = ws.memo_credits or 0

    new_credits = body.credits if body.credits is not None else PLAN_CREDITS.get(
        body.plan_tier, PLAN_CREDITS["solo"]
    )

    ws.plan_tier = body.plan_tier
    ws.memo_credits = new_credits
    # Only mark comped when we're not shadowing a real subscription; dropping
    # to solo clears the marker so the account looks untouched again.
    if not ws.stripe_subscription_id:
        ws.subscription_status = "comped" if body.plan_tier != "solo" else None

    delta = new_credits - old_credits
    if delta:
        db.add(
            CreditLog(
                workspace_id=ws.id,
                user_id=user.id,
                action="plan_change",
                delta=delta,
            )
        )

    await db.commit()
    logger.info(
        "ADMIN %s set %s (workspace %s) from %s to %s, credits %d -> %d (force=%s, note=%s)",
        admin.email, user.email, ws.id, old_tier, body.plan_tier,
        old_credits, new_credits, body.force, body.note,
    )
    return SetPlanResponse(
        detail=f"Plan set to {body.plan_tier} with {new_credits} credits.",
        user_id=str(user.id),
        email=user.email,
        workspace_id=str(ws.id),
        plan_tier=ws.plan_tier,
        memo_credits=ws.memo_credits,
        subscription_status=ws.subscription_status,
    )


# ── Vouchers ──────────────────────────────────────────────────────────────────

def _generate_code() -> str:
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O/1/I/L
    part = lambda: "".join(secrets.choice(alphabet) for _ in range(4))  # noqa: E731
    return f"ARTH-{part()}-{part()}"


@router.post("/vouchers", response_model=VoucherRow)
@limiter.limit("60/hour")
async def create_voucher(
    request: Request,
    body: CreateVoucherRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
) -> VoucherRow:
    code = (body.code or _generate_code()).strip().upper()

    existing = (
        await db.execute(select(Voucher).where(Voucher.code == code))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Voucher code already exists.")

    expires_at = (
        datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)
        if body.expires_in_days
        else None
    )
    voucher = Voucher(
        code=code,
        credits=body.credits,
        max_redemptions=body.max_redemptions,
        expires_at=expires_at,
        note=body.note,
        created_by=admin.id,
    )
    db.add(voucher)
    await db.commit()
    await db.refresh(voucher)
    logger.info("ADMIN %s created voucher %s (+%d x%d)", admin.email, code, body.credits, body.max_redemptions)
    return _voucher_row(voucher)


@router.get("/vouchers", response_model=list[VoucherRow])
async def list_vouchers(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
) -> list[VoucherRow]:
    vouchers = (
        (await db.execute(select(Voucher).order_by(Voucher.created_at.desc()).limit(200)))
        .scalars()
        .all()
    )
    return [_voucher_row(v) for v in vouchers]


@router.delete("/vouchers/{voucher_id}")
async def delete_voucher(
    voucher_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_session),
) -> dict:
    voucher = await db.get(Voucher, voucher_id)
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found.")
    await db.delete(voucher)
    await db.commit()
    logger.info("ADMIN %s deleted voucher %s", admin.email, voucher.code)
    return {"detail": "Voucher deleted."}


def _voucher_row(v: Voucher) -> VoucherRow:
    return VoucherRow(
        id=str(v.id),
        code=v.code,
        credits=v.credits,
        max_redemptions=v.max_redemptions,
        redeemed_count=v.redeemed_count,
        expires_at=v.expires_at,
        note=v.note,
        created_at=v.created_at,
    )
