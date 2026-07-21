"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import type { AdminUser } from "../types";
import { btn, input, planBadge, PLAN_TIERS } from "../styles";

type PlanPatch = Pick<AdminUser, "plan_tier" | "memo_credits" | "subscription_status">;

/** Inline plan editor — comps a user onto a tier with no payment involved.
 *
 * The backend refuses with 409 when the workspace has a live Stripe
 * subscription, because the next subscription webhook would silently revert
 * the change. We surface that as an explicit override rather than retrying
 * with force, so the admin sees what they're stepping on. */
export function PlanCell({
  user,
  onUpdated,
}: {
  user: AdminUser;
  onUpdated: (patch: PlanPatch) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [tier, setTier] = useState(user.plan_tier);
  const [credits, setCredits] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  const close = () => {
    setEditing(false);
    setConflict(null);
    setCredits("");
  };

  const save = async (force = false) => {
    setSaving(true);
    try {
      const parsed = parseInt(credits, 10);
      const res = await apiFetch(`/api/v1/admin/users/${user.id}/plan`, {
        method: "POST",
        body: JSON.stringify({
          plan_tier: tier,
          ...(Number.isFinite(parsed) && credits.trim() !== "" ? { credits: parsed } : {}),
          ...(force ? { force: true } : {}),
        }),
      });
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        setConflict(body.detail ?? "This workspace has a live Stripe subscription.");
        return;
      }
      if (!res.ok) {
        setConflict("Could not update the plan. Check the server logs.");
        return;
      }
      const data = await res.json();
      onUpdated({
        plan_tier: data.plan_tier,
        memo_credits: data.memo_credits,
        subscription_status: data.subscription_status,
      });
      close();
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => { setTier(user.plan_tier); setEditing(true); }}
        title="Change plan (no payment taken)"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "none", border: "none", padding: 0, cursor: "pointer",
        }}
      >
        <span style={planBadge(user.plan_tier)}>{user.plan_tier}</span>
        {user.subscription_status === "comped" && (
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--n400)" }}>comped</span>
        )}
      </button>
    );
  }

  const selected = PLAN_TIERS.find((p) => p.value === tier);

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 6, minWidth: 240 }}>
      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <select
          style={{ ...input, padding: "5px 8px" }}
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          autoFocus
        >
          {PLAN_TIERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <input
          style={{ ...input, width: 88, padding: "5px 8px" }}
          type="number"
          min={0}
          placeholder={
            selected && selected.credits >= 999_999 ? "∞" : String(selected?.credits ?? "")
          }
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
          title="Credits to grant — leave blank for the tier default"
        />
        <button
          style={{ ...btn, background: "var(--b600)", color: "#fff" }}
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "…" : "Save"}
        </button>
        <button
          style={{ ...btn, background: "transparent", color: "var(--n400)", padding: 4 }}
          onClick={close}
        >
          <X size={14} />
        </button>
      </div>
      {conflict && (
        <div style={{ fontSize: 11, color: "var(--r600, #B3261E)", lineHeight: 1.4 }}>
          {conflict}
          <button
            style={{
              ...btn, background: "var(--r50, #FDECEA)", color: "var(--r700, #8C1D18)",
              padding: "3px 8px", marginLeft: 6,
            }}
            disabled={saving}
            onClick={() => void save(true)}
          >
            Override anyway
          </button>
        </div>
      )}
    </div>
  );
}
