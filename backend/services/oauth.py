"""OAuth 2.0 / OIDC helpers for Google + Microsoft SSO.

Stateless authorization-code flow:
  1. `/auth/oauth/{provider}/login` builds an authorize URL with a signed
     `state` (a short-lived JWT carrying a nonce + the post-login redirect).
  2. The provider redirects the browser back to `/callback?code=&state=`.
  3. We verify the state signature, exchange the code for tokens, fetch the
     user's email/name, and hand the caller a normalized OAuthIdentity.

No server-side session store is needed — the signed state is the CSRF guard.
"""
from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from jose import JWTError, jwt

from backend.core.config import get_settings

_STATE_TTL_SECONDS = 600  # 10 minutes to complete the round trip


@dataclass(frozen=True)
class ProviderConfig:
    name: str
    authorize_url: str
    token_url: str
    userinfo_url: str
    scope: str


def _provider_config(provider: str) -> ProviderConfig:
    settings = get_settings()
    if provider == "google":
        return ProviderConfig(
            name="google",
            authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            userinfo_url="https://openidconnect.googleapis.com/v1/userinfo",
            scope="openid email profile",
        )
    if provider == "microsoft":
        tenant = settings.microsoft_tenant or "common"
        base = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0"
        return ProviderConfig(
            name="microsoft",
            authorize_url=f"{base}/authorize",
            token_url=f"{base}/token",
            userinfo_url="https://graph.microsoft.com/oidc/userinfo",
            scope="openid email profile",
        )
    raise ValueError(f"Unknown OAuth provider: {provider}")


def _credentials(provider: str) -> tuple[str, str]:
    s = get_settings()
    if provider == "google":
        return s.google_client_id, s.google_client_secret
    if provider == "microsoft":
        return s.microsoft_client_id, s.microsoft_client_secret
    raise ValueError(f"Unknown OAuth provider: {provider}")


def provider_configured(provider: str) -> bool:
    try:
        cid, secret = _credentials(provider)
    except ValueError:
        return False
    return bool(cid and secret)


def redirect_uri(provider: str) -> str:
    base = get_settings().api_base_url.rstrip("/")
    return f"{base}/api/v1/auth/oauth/{provider}/callback"


# ── Signed state (CSRF) ─────────────────────────────────────────────────────

def make_state(provider: str, next_path: str) -> str:
    settings = get_settings()
    payload = {
        "typ": "oauth_state",
        "provider": provider,
        "next": next_path or "/app",
        "nonce": secrets.token_urlsafe(16),
        "exp": datetime.now(timezone.utc) + timedelta(seconds=_STATE_TTL_SECONDS),
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def read_state(provider: str, state: str) -> str:
    """Return the validated `next` path, or raise ValueError."""
    settings = get_settings()
    try:
        data = jwt.decode(state, settings.secret_key, algorithms=["HS256"])
    except JWTError as exc:
        raise ValueError("Invalid or expired state") from exc
    if data.get("typ") != "oauth_state" or data.get("provider") != provider:
        raise ValueError("State does not match this provider")
    nxt = data.get("next") or "/app"
    # Only allow same-site relative redirects (prevents open-redirect abuse).
    if not nxt.startswith("/") or nxt.startswith("//"):
        nxt = "/app"
    return nxt


# ── Authorize URL ───────────────────────────────────────────────────────────

def authorize_url(provider: str, next_path: str) -> str:
    cfg = _provider_config(provider)
    client_id, _ = _credentials(provider)
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri(provider),
        "response_type": "code",
        "scope": cfg.scope,
        "state": make_state(provider, next_path),
        "access_type": "offline",
        "prompt": "select_account",
    }
    return f"{cfg.authorize_url}?{urlencode(params)}"


# ── Code → identity ─────────────────────────────────────────────────────────

@dataclass(frozen=True)
class OAuthIdentity:
    email: str
    full_name: str | None
    email_verified: bool


async def exchange_code(provider: str, code: str) -> OAuthIdentity:
    cfg = _provider_config(provider)
    client_id, client_secret = _credentials(provider)

    async with httpx.AsyncClient(timeout=15) as client:
        token_res = await client.post(
            cfg.token_url,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri(provider),
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"},
        )
        token_res.raise_for_status()
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise ValueError("No access_token returned by provider")

        info_res = await client.get(
            cfg.userinfo_url,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        info_res.raise_for_status()
        info = info_res.json()

    email = (info.get("email") or "").strip().lower()
    if not email:
        raise ValueError("Provider did not return an email address")
    name = info.get("name") or info.get("given_name") or None
    # Google returns email_verified; Microsoft Graph OIDC implies verified.
    verified = bool(info.get("email_verified", True))
    return OAuthIdentity(email=email, full_name=name, email_verified=verified)
