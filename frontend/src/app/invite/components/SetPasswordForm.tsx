"use client";

import { useState } from "react";
import { primaryBtn } from "./InviteShell";

const field: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 6,
  border: "1px solid #dfe1e6", fontSize: 14, outline: "none",
  boxSizing: "border-box",
};
const label: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "#44546F", marginBottom: 6,
};

/** Password setup for an invitee who has no account yet.
 *
 * The email is fixed by the invite and shown read-only — the backend reads it
 * from the invite token, never from this form. */
export function SetPasswordForm({
  email,
  submitting,
  error,
  onSubmit,
}: {
  email: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (password: string, fullName: string) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setLocalError("Passwords don't match.");
      return;
    }
    onSubmit(password, fullName);
  };

  const shown = localError ?? error;

  return (
    <form onSubmit={submit} style={{ textAlign: "left" }}>
      <div style={{ marginBottom: 14 }}>
        <label style={label}>Email</label>
        <input
          style={{ ...field, background: "#f4f5f7", color: "#626F86" }}
          value={email}
          readOnly
          disabled
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Your name</label>
        <input
          style={field}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Chen"
          autoFocus
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Create a password</label>
        <input
          style={field}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Confirm password</label>
        <input
          style={field}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {shown && (
        <p style={{ fontSize: 12, color: "#B3261E", margin: "0 0 12px", lineHeight: 1.5 }}>
          {shown}
        </p>
      )}

      <button type="submit" disabled={submitting} style={{ ...primaryBtn, width: "100%" }}>
        {submitting ? "Creating your account…" : "Create account & join"}
      </button>
    </form>
  );
}
