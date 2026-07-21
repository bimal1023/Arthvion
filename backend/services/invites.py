"""Workspace-invite acceptance, shared by the two paths that can trigger it.

Both email verification and invite-driven signup end with "put this user into
every workspace that invited them", so the logic lives here rather than being
written twice.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.db import User, WorkspaceInvite, WorkspaceMember

logger = logging.getLogger(__name__)


async def accept_pending_invites(db: AsyncSession, user: User) -> list[WorkspaceInvite]:
    """Join `user` to every unexpired, unaccepted invite for their address.

    Sets `active_workspace_id` to the last workspace joined so the user lands
    in the inviting workspace rather than their personal one. Flushes but does
    not commit — the caller owns the transaction.

    Returns the invites that were consumed (empty list if there were none).
    """
    now = datetime.now(timezone.utc)
    pending = (
        await db.execute(
            select(WorkspaceInvite).where(
                WorkspaceInvite.email == user.email,
                WorkspaceInvite.accepted_at.is_(None),
                WorkspaceInvite.expires_at > now,
            )
        )
    ).scalars().all()

    for inv in pending:
        already = (
            await db.execute(
                select(WorkspaceMember).where(
                    WorkspaceMember.workspace_id == inv.workspace_id,
                    WorkspaceMember.user_id == user.id,
                )
            )
        ).scalar_one_or_none()
        inv.accepted_at = now
        if already:
            continue
        db.add(
            WorkspaceMember(
                workspace_id=inv.workspace_id,
                user_id=user.id,
                role=inv.role,
            )
        )
        user.active_workspace_id = inv.workspace_id

    if pending:
        await db.flush()
        logger.info("Accepted %d pending invite(s) for %s", len(pending), user.email)
    return list(pending)
