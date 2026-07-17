"""Seed (or reset) the platform admin account, pre-verified.

Needed because login requires a verified email and admin@arthvion.com has no
real mailbox to receive the verification link.

Usage (from repo root, or inside the backend container):
    python -m backend.scripts.create_admin --email admin@arthvion.com --password 'S3curePass!'

If the user already exists, the password is updated and the account is
marked verified (idempotent).
"""
from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone

from sqlalchemy import select

from backend.core.auth import hash_password
from backend.core.database import get_session_factory
from backend.models.db import User, Workspace, WorkspaceMember


async def create_admin(email: str, password: str) -> None:
    factory = get_session_factory()
    async with factory() as db:
        user = (
            await db.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()

        if user:
            user.hashed_password = hash_password(password)
            user.is_verified = True
            user.verified_at = user.verified_at or datetime.now(timezone.utc)
            await db.commit()
            print(f"Updated existing user {email}: password reset, verified.")
            return

        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name="Arthvion Admin",
            is_verified=True,
            verified_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.flush()

        ws = Workspace(
            name="Arthvion Admin",
            slug=str(user.id),
            plan_tier="firm",
            memo_credits=999_999,
        )
        db.add(ws)
        await db.flush()

        db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="admin"))
        user.active_workspace_id = ws.id
        await db.commit()
        print(f"Created admin user {email} (verified, firm-tier workspace).")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()
    asyncio.run(create_admin(args.email.strip().lower(), args.password))


if __name__ == "__main__":
    main()
