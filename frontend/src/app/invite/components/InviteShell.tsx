"use client";

import type { ReactNode } from "react";
import { Check, X, Loader2, LogOut, Mail, KeyRound } from "lucide-react";

export type InviteTone = "loading" | "success" | "error" | "warn" | "form" | "email";

const GRADIENTS: Record<InviteTone, string> = {
  loading: "linear-gradient(135deg, #0C66E4 0%, #08458C 100%)",
  form: "linear-gradient(135deg, #0C66E4 0%, #08458C 100%)",
  success: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  warn: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  error: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  email: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
};

function Icon({ tone }: { tone: InviteTone }) {
  const p = { size: 24, color: "#fff" };
  if (tone === "loading") return <Loader2 {...p} className="spin" />;
  if (tone === "success") return <Check {...p} />;
  if (tone === "warn") return <LogOut {...p} />;
  if (tone === "error") return <X {...p} />;
  if (tone === "email") return <Mail {...p} />;
  return <KeyRound {...p} />;
}

/** Card chrome shared by every state of the invite flow. */
export function InviteShell({
  tone,
  title,
  message,
  children,
  align = "center",
}: {
  tone: InviteTone;
  title: string;
  message?: ReactNode;
  children?: ReactNode;
  align?: "center" | "left";
}) {
  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--n25, #f8f9fb)", padding: 20,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff", borderRadius: 12, padding: "40px 48px",
          border: "1px solid #e4e7ec", maxWidth: 440, width: "100%",
          textAlign: align,
        }}
      >
        <div
          style={{
            width: 56, height: 56, borderRadius: 12,
            margin: align === "center" ? "0 auto 20px" : "0 0 20px",
            background: GRADIENTS[tone],
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon tone={tone} />
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#091E42", margin: "0 0 8px" }}>
          {title}
        </h1>

        {message && (
          <p style={{ fontSize: 14, color: "#626F86", lineHeight: 1.6, margin: "0 0 24px" }}>
            {message}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}

export const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "10px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600,
  cursor: "pointer", border: "none", background: "#0C66E4", color: "#fff",
};
