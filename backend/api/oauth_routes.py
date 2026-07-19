"""OAuth / SSO endpoints — Continue with Google / Microsoft.

Mounted at /api/v1/auth/oauth/* by backend.main.

Flow:
  GET  /auth/oauth/providers            → {google: bool, microsoft: bool} (UI gating)
  GET  /auth/oauth/{provider}/login     → {authorize_url} (frontend redirects there)
  GET  /auth/oauth/{provider}/callback  → find/create user, mint JWT, 302 to the app
"""
from __future__ import annotations

import logging
import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.auth import create_access_token, hash_password
from backend.core.config import get_settings
from backend.core.database import get_session
from backend.models.db import User, Workspace, WorkspaceMember
from backend.services import oauth

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/oauth", tags=["auth"])

_PROVIDERS = ("google", "microsoft")


@router.get("/providers")
async def providers_status() -> dict:
    """Which SSO providers are configured — drives which buttons the UI shows."""
    return {p: oauth.provider_configured(p) for p in _PROVIDERS}


@router.get("/{provider}/login")
async def oauth_login(
    provider: str,
    next: str = Query(default="/app"),
) -> dict:
    """Return the provider authorize URL for the frontend to navigate to."""
    if provider not in _PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider.")
    if not oauth.provider_configured(provider):
        raise HTTPException(status_code=503, detail=f"{provider.title()} sign-in is not configured.")
    return {"authorize_url": oauth.authorize_url(provider, next)}


def _fail_redirect(message: str) -> RedirectResponse:
    app_url = get_settings().app_url.rstrip("/")
    return RedirectResponse(url=f"{app_url}/login?error={urlencode({'m': message})[2:]}", status_code=302)


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_session),
) -> RedirectResponse:
    settings = get_settings()
    app_url = settings.app_url.rstrip("/")

    if provider not in _PROVIDERS or not oauth.provider_configured(provider):
        return _fail_redirect("This sign-in method is unavailable.")
    if error:
        logger.info("OAuth %s returned error: %s", provider, error)
        return _fail_redirect("Sign-in was cancelled.")
    if not code or not state:
        return _fail_redirect("Sign-in did not complete. Please try again.")

    try:
        next_path = oauth.read_state(provider, state)
    except ValueError:
        return _fail_redirect("Your sign-in link expired. Please try again.")

    try:
        identity = await oauth.exchange_code(provider, code)
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("OAuth %s code exchange failed: %s", provider, exc)
        return _fail_redirect("Could not verify your account with the provider.")

    # ── Find or create the user ──────────────────────────────────────────────
    user = (
        await db.execute(select(User).where(User.email == identity.email))
    ).scalar_one_or_none()

    if user is None:
        user = User(
            email=identity.email,
            # SSO users have no usable password — store a random unguessable hash
            # so password login is impossible but the NOT NULL constraint holds.
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            full_name=identity.full_name,
            is_verified=True,
        )
        db.add(user)
        await db.flush()

        ws = Workspace(name=identity.email, slug=str(user.id), plan_tier="solo", memo_credits=3)
        db.add(ws)
        await db.flush()
        db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="admin"))
        user.active_workspace_id = ws.id
        await db.commit()
        await db.refresh(user)
        logger.info("Created SSO user %s via %s", identity.email, provider)
    else:
        # Existing account — SSO counts as email verification.
        if not user.is_verified:
            user.is_verified = True
            await db.commit()
        logger.info("SSO login for existing user %s via %s", identity.email, provider)

    token = create_access_token(user.id)
    # Token in the URL fragment (#) so it never reaches server logs / referrers.
    return RedirectResponse(url=f"{app_url}/auth/callback#token={token}&next={next_path}", status_code=302)
