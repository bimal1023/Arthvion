"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X, MessageSquare, Phone, Mail, Calendar, CheckSquare, Square,
  Send, Trash2, FileText, ArrowUpRight,
} from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Spinner, fmtUSD } from "./ui";
import { ScreeningPanel } from "./ScreeningPanel";
import type { Deal, Interaction, InteractionKind } from "@/lib/types";

/* ── Kind metadata ──────────────────────────────────────────── */

const KINDS: { key: InteractionKind; label: string; icon: React.ElementType }[] = [
  { key: "note",    label: "Note",    icon: MessageSquare },
  { key: "call",    label: "Call",    icon: Phone },
  { key: "email",   label: "Email",   icon: Mail },
  { key: "meeting", label: "Meeting", icon: Calendar },
  { key: "task",    label: "Task",    icon: CheckSquare },
];
const KIND_ICON: Record<InteractionKind, React.ElementType> =
  Object.fromEntries(KINDS.map((k) => [k.key, k.icon])) as Record<InteractionKind, React.ElementType>;

const STAGE_LABEL: Record<string, string> = {
  sourced: "Sourced", screening: "Screening", diligence: "Diligence",
  ic_review: "IC Review", closing: "Closing", won: "Won", passed: "Passed",
};

/* ── Helpers ────────────────────────────────────────────────── */

function fmtWhen(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function fmtDue(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ── Component ──────────────────────────────────────────────── */

export function DealDetail({
  deal, onClose, onOpenReport,
}: {
  deal: Deal;
  onClose: () => void;
  onOpenReport?: (reportId: string) => void;
}) {
  const [items, setItems] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<InteractionKind>("note");
  const [body, setBody] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/api/v1/deals/${deal.id}/interactions`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Interaction[]) => setItems(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deal.id]);

  useEffect(() => { load(); }, [load]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function addInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || saving) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/v1/deals/${deal.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          kind,
          body: body.trim(),
          due_at: kind === "task" && due ? new Date(due).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        const created: Interaction = await res.json();
        setItems((prev) => [created, ...prev]);
        setBody(""); setDue("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(item: Interaction) {
    const completed = !item.completed_at;
    setItems((prev) => prev.map((i) =>
      i.id === item.id ? { ...i, completed_at: completed ? new Date().toISOString() : null } : i));
    await apiFetch(`/api/v1/interactions/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    }).catch(() => load());
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await apiFetch(`/api/v1/interactions/${id}`, { method: "DELETE" }).catch(() => load());
  }

  const ready = deal.report_status === "complete";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 210, background: "rgba(9,30,66,0.42)",
        display: "flex", justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 460, height: "100%", background: "var(--n0)",
          borderLeft: "1px solid var(--n30)", boxShadow: "var(--e400)",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "var(--s-100)",
          padding: "var(--s-250) var(--s-250) var(--s-150)", borderBottom: "1px solid var(--n30)",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: "var(--n900)" }}>{deal.company}</span>
              {deal.ticker && (
                <span className="mono" style={{
                  fontSize: 10, fontWeight: 700, color: "var(--b700)", background: "var(--b50)",
                  padding: "1px 5px", borderRadius: "var(--r-1)",
                }}>{deal.ticker}</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--n400)" }}>
                {STAGE_LABEL[deal.stage] ?? deal.stage}
              </span>
              {deal.deal_size_usd != null && deal.deal_size_usd > 0 && (
                <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--n800)" }}>
                  ${fmtUSD(deal.deal_size_usd)}
                </span>
              )}
              {deal.conviction && (
                <span style={{ fontSize: 11, color: "var(--n300)", textTransform: "capitalize" }}>
                  {deal.conviction} conviction
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} title="Close"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--n200)", flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Linked memo */}
        {ready && deal.report_id && (
          <button type="button" onClick={() => onOpenReport?.(deal.report_id!)} style={{
            display: "inline-flex", alignItems: "center", gap: 6, margin: "var(--s-150) var(--s-250) 0",
            fontSize: 12, fontWeight: 700, color: "var(--g600)", background: "var(--g50)",
            border: "1px solid var(--g100)", borderRadius: "var(--r-2)", padding: "7px 10px", cursor: "pointer",
          }}>
            <FileText size={13} /> Open deep dive report <ArrowUpRight size={12} />
          </button>
        )}

        {/* AI screen — go/no-go grounded in the deal record */}
        <ScreeningPanel dealId={deal.id} />

        {/* Activity timeline */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--s-200) var(--s-250)" }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "var(--n400)", textTransform: "uppercase",
            letterSpacing: "0.05em", marginBottom: "var(--s-150)",
          }}>Activity</div>

          {loading ? (
            <div style={{ padding: 24, display: "flex", justifyContent: "center" }}><Spinner /></div>
          ) : items.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "var(--n300)", lineHeight: 1.6 }}>
              No activity yet. Log a note, call, or task below to start the deal&rsquo;s timeline.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-100)" }}>
              {items.map((item) => {
                const Icon = KIND_ICON[item.kind] ?? MessageSquare;
                const isTask = item.kind === "task";
                const done = !!item.completed_at;
                return (
                  <div key={item.id} style={{
                    display: "flex", gap: "var(--s-100)", padding: "var(--s-125)",
                    border: "1px solid var(--n30)", borderRadius: "var(--r-2)", background: "var(--n0)",
                  }}>
                    {isTask ? (
                      <button type="button" onClick={() => toggleTask(item)} title={done ? "Mark incomplete" : "Mark complete"}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: done ? "var(--g600)" : "var(--n300)", flexShrink: 0, marginTop: 1 }}>
                        {done ? <CheckSquare size={15} /> : <Square size={15} />}
                      </button>
                    ) : (
                      <span style={{ color: "var(--n300)", flexShrink: 0, marginTop: 1 }}><Icon size={15} /></span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12.5, color: "var(--n800)", lineHeight: 1.5, whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        textDecoration: done ? "line-through" : "none",
                        opacity: done ? 0.6 : 1,
                      }}>{item.body}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10.5, color: "var(--n300)" }}>
                          {item.actor_name} · {fmtWhen(item.occurred_at)}
                        </span>
                        {isTask && item.due_at && (
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: done ? "var(--n300)" : "var(--y700)" }}>
                            Due {fmtDue(item.due_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button type="button" onClick={() => removeItem(item.id)} title="Delete"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--n200)", flexShrink: 0 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={addInteraction} style={{
          borderTop: "1px solid var(--n30)", padding: "var(--s-150) var(--s-250) var(--s-200)",
          display: "flex", flexDirection: "column", gap: "var(--s-100)",
        }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {KINDS.map((k) => {
              const active = kind === k.key;
              const Icon = k.icon;
              return (
                <button key={k.key} type="button" onClick={() => setKind(k.key)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600,
                  padding: "4px 9px", borderRadius: "var(--r-1)", cursor: "pointer",
                  border: `1px solid ${active ? "var(--b500)" : "var(--n30)"}`,
                  background: active ? "var(--b50)" : "var(--n0)",
                  color: active ? "var(--b700)" : "var(--n400)",
                }}>
                  <Icon size={12} /> {k.label}
                </button>
              );
            })}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={kind === "task" ? "Describe the task…" : "Log a note…"}
            rows={2}
            style={{
              resize: "vertical", minHeight: 44, padding: "var(--s-100) var(--s-150)",
              borderRadius: "var(--r-2)", border: "1px solid var(--n30)", background: "var(--n0)",
              color: "var(--n800)", fontSize: 13, outline: "none", fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-100)" }}>
            {kind === "task" && (
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} title="Due date"
                style={{
                  padding: "6px 8px", borderRadius: "var(--r-2)", border: "1px solid var(--n30)",
                  background: "var(--n0)", color: "var(--n800)", fontSize: 12.5, outline: "none",
                }} />
            )}
            <span style={{ flex: 1 }} />
            <button type="submit" disabled={saving || !body.trim()} style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: "var(--r-2)", background: "var(--b500)", color: "#fff", border: "none",
              fontSize: 13, fontWeight: 600, cursor: saving || !body.trim() ? "default" : "pointer",
              opacity: saving || !body.trim() ? 0.6 : 1,
            }}>
              {saving ? <Spinner /> : <Send size={13} />} Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
