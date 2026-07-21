"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut } from "lucide-react";
import { apiFetch, getToken, clearToken } from "@/lib/auth";
import { InviteShell, primaryBtn } from "./components/InviteShell";
import { SetPasswordForm } from "./components/SetPasswordForm";

type Lookup = {
  email: string;
  workspace_name: string;
  role: string;
  inviter_name: string | null;
  account_exists: boolean;
};

type Phase =
  | "loading"
  | "set-password"   // no account yet → create one inline
  | "check-email"    // account created, verification sent
  | "success"
  | "wrong-account"
  | "error";

function InviteContent() {
  const router = useRouter();
  const token = useSearchParams().get("token");

  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("");
  const [invite, setInvite] = useState<Lookup | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /** Logged-in path: claim the invite for the current session. */
  const acceptAsCurrentUser = useCallback(async () => {
    const res = await apiFetch("/api/v1/team/accept-invite", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => null);

    if (res.ok) {
      setPhase("success");
      setMessage(
        data?.status === "already_member"
          ? "You're already a member of this workspace."
          : `You've joined ${data?.workspace_name || "the workspace"} as ${data?.role || "a member"}.`,
      );
      setTimeout(() => router.push("/app"), 2000);
      return;
    }
    if (res.status === 403 && data?.detail?.toLowerCase().includes("different email")) {
      setPhase("wrong-account");
      setMessage(
        "You're signed in with a different account than the one this invite was sent to. " +
        "Sign out and continue with the invited address.",
      );
      return;
    }
    setPhase("error");
    setMessage(data?.detail || "Failed to accept invite.");
  }, [token, router]);

  useEffect(() => {
    if (!token) {
      setPhase("error");
      setMessage("Invalid invite link — no token provided.");
      return;
    }

    void (async () => {
      try {
        // Public lookup — works signed out, so we can decide between "set a
        // password" and "log in" before sending anyone to an auth screen.
        // Relative path — next.config.ts rewrites /api/v1/* to the backend.
        // Plain fetch (not apiFetch) because this runs signed out.
        const res = await fetch(
          `/api/v1/team/invites/lookup?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setPhase("error");
          setMessage(data?.detail || "This invite is no longer valid.");
          return;
        }

        setInvite(data as Lookup);

        if (getToken()) {
          await acceptAsCurrentUser();
          return;
        }
        if (data.account_exists) {
          // They already have an account — log in, then come back here.
          const back = `/invite?token=${encodeURIComponent(token)}`;
          router.replace(`/login?next=${encodeURIComponent(back)}`);
          return;
        }
        setPhase("set-password");
      } catch {
        setPhase("error");
        setMessage("Something went wrong. Please try again.");
      }
    })();
  }, [token, router, acceptAsCurrentUser]);

  const createAccount = async (password: string, fullName: string) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/v1/auth/invite-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, full_name: fullName || null }),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 409) {
        // Account appeared in the meantime — send them to log in instead.
        const back = `/invite?token=${encodeURIComponent(token || "")}`;
        router.replace(`/login?next=${encodeURIComponent(back)}`);
        return;
      }
      if (!res.ok) {
        setFormError(data?.detail || "Could not create your account.");
        return;
      }
      setPhase("check-email");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  function switchAccount() {
    clearToken();
    const back = `/invite?token=${encodeURIComponent(token || "")}`;
    router.replace(`/login?next=${encodeURIComponent(back)}`);
  }

  if (phase === "set-password" && invite) {
    return (
      <InviteShell
        tone="form"
        align="left"
        title={`Join ${invite.workspace_name}`}
        message={
          <>
            {invite.inviter_name ? `${invite.inviter_name} invited you` : "You've been invited"} to
            join <strong>{invite.workspace_name}</strong> as {invite.role}. Set a password to
            create your account.
          </>
        }
      >
        <SetPasswordForm
          email={invite.email}
          submitting={submitting}
          error={formError}
          onSubmit={createAccount}
        />
      </InviteShell>
    );
  }

  if (phase === "check-email" && invite) {
    return (
      <InviteShell
        tone="email"
        title="Verify your email"
        message={
          <>
            We sent a verification link to <strong>{invite.email}</strong>. Open it to confirm
            your account — you&apos;ll be signed in and dropped straight into{" "}
            <strong>{invite.workspace_name}</strong>.
          </>
        }
      >
        <p style={{ fontSize: 13, color: "#8590A2", margin: 0 }}>
          Nothing yet? Check your spam folder.
        </p>
      </InviteShell>
    );
  }

  const tone =
    phase === "success" ? "success" :
    phase === "wrong-account" ? "warn" :
    phase === "error" ? "error" : "loading";
  const title =
    phase === "success" ? "Welcome to the team!" :
    phase === "wrong-account" ? "Wrong account" :
    phase === "error" ? "Invite failed" : "Checking your invite…";

  return (
    <InviteShell tone={tone} title={title} message={message}>
      {phase === "success" && (
        <p style={{ fontSize: 13, color: "#8590A2" }}>Redirecting to dashboard…</p>
      )}
      {phase === "wrong-account" && (
        <button onClick={switchAccount} style={primaryBtn}>
          <LogOut size={14} /> Sign out &amp; switch account
        </button>
      )}
      {phase === "error" && (
        <button onClick={() => router.push("/app")} style={primaryBtn}>
          Go to dashboard
        </button>
      )}
    </InviteShell>
  );
}

// `useSearchParams()` forces client-side rendering, so Next.js 15 requires the
// component that calls it to sit inside a Suspense boundary — otherwise the
// static prerender of /invite fails the production build.
export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteContent />
    </Suspense>
  );
}
