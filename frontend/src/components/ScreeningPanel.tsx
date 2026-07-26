"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Check, AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Spinner } from "./ui";
import type { ScreeningMemo, ScreeningRecommendation } from "@/lib/types";

const REC: Record<ScreeningRecommendation, { label: string; bg: string; fg: string; border: string }> = {
  pursue: { label: "Pursue", bg: "var(--g50)", fg: "var(--g600)", border: "var(--g100)" },
  hold:   { label: "Hold",   bg: "var(--y50)", fg: "var(--y700)", border: "var(--y100)" },
  pass:   { label: "Pass",   bg: "var(--r50)", fg: "var(--r600)", border: "var(--r100)" },
};

function grounding(memo: ScreeningMemo): string {
  const n = memo.grounded_on?.interaction_count ?? 0;
  const parts = [`${n} activity item${n === 1 ? "" : "s"}`];
  if (memo.grounded_on?.report_linked) parts.push("linked diligence report");
  return `Grounded in ${parts.join(" + ")}`;
}

export function ScreeningPanel({ dealId }: { dealId: string }) {
  const [memo, setMemo] = useState<ScreeningMemo | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/api/v1/deals/${dealId}/screening`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ScreeningMemo | null) => setMemo(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dealId]);

  useEffect(() => { load(); }, [load]);

  async function runScreen() {
    setRunning(true);
    setError("");
    try {
      const res = await apiFetch(`/api/v1/deals/${dealId}/screen`, { method: "POST" });
      if (res.ok) {
        setMemo(await res.json());
      } else if (res.status === 429) {
        setError("Rate limit reached — try again shortly.");
      } else {
        setError("Couldn't generate a screen. Please try again.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setRunning(false);
    }
  }

  if (loading) return null;

  const rec = memo ? REC[memo.recommendation] : null;

  return (
    <div style={{
      margin: "var(--s-150) var(--s-250) 0", padding: "var(--s-150)",
      border: "1px solid var(--n30)", borderRadius: "var(--r-3)", background: "var(--n0)",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex", color: "var(--b600)" }}><Sparkles size={14} /></span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--n900)" }}>AI Screen</span>
        {rec && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 999,
            background: rec.bg, color: rec.fg, border: `1px solid ${rec.border}`,
          }}>{rec.label}</span>
        )}
        {memo?.thesis_fit_score != null && (
          <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--n400)" }}>
            {memo.thesis_fit_score}/100 fit
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" onClick={runScreen} disabled={running} title={memo ? "Re-run screen" : "Run screen"}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
            padding: "5px 10px", borderRadius: "var(--r-2)", cursor: running ? "default" : "pointer",
            border: memo ? "1px solid var(--n30)" : "none",
            background: memo ? "var(--n0)" : "var(--b500)",
            color: memo ? "var(--n400)" : "#fff", opacity: running ? 0.7 : 1,
          }}>
          {running ? <Spinner /> : memo ? <RefreshCw size={12} /> : <Sparkles size={12} />}
          {running ? "Screening…" : memo ? "Re-run" : "Screen this deal"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--r600)" }}>{error}</div>
      )}

      {/* Empty prompt */}
      {!memo && !running && !error && (
        <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--n300)", lineHeight: 1.5 }}>
          Generate a fast go/no-go opinion grounded in this deal&rsquo;s notes, activity, and any linked report.
        </p>
      )}

      {/* Result */}
      {memo && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {memo.summary && (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--n800)", lineHeight: 1.55 }}>{memo.summary}</p>
          )}

          {memo.strengths.length > 0 && (
            <PointList title="Strengths" color="var(--g600)" icon={Check} items={memo.strengths} />
          )}
          {memo.concerns.length > 0 && (
            <PointList title="Concerns" color="var(--y700)" icon={AlertTriangle} items={memo.concerns} />
          )}

          {memo.next_step && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 7, padding: "8px 10px",
              background: "var(--b50)", border: "1px solid var(--b75)", borderRadius: "var(--r-2)",
            }}>
              <span style={{ color: "var(--b600)", flexShrink: 0, marginTop: 1 }}><ArrowRight size={13} /></span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--b700)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Next step
                </div>
                <div style={{ fontSize: 12.5, color: "var(--n800)", lineHeight: 1.5, marginTop: 2 }}>{memo.next_step}</div>
              </div>
            </div>
          )}

          <div style={{ fontSize: 10, color: "var(--n200)" }}>{grounding(memo)}</div>
        </div>
      )}
    </div>
  );
}

function PointList({
  title, color, icon: Icon, items,
}: {
  title: string;
  color: string;
  icon: React.ElementType;
  items: string[];
}) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: "var(--n400)", textTransform: "uppercase",
        letterSpacing: "0.05em", marginBottom: 4,
      }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <span style={{ color, flexShrink: 0, marginTop: 2 }}><Icon size={12} /></span>
            <span style={{ fontSize: 12, color: "var(--n800)", lineHeight: 1.5 }}>{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
