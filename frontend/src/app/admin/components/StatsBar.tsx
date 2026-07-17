"use client";

import type { AdminOverview } from "../types";

const tile: React.CSSProperties = {
  flex: "1 1 140px", minWidth: 140, background: "var(--n0)",
  border: "1px solid var(--n100)", borderRadius: 10, padding: "14px 16px",
};
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--n500)",
  textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6,
};
const value: React.CSSProperties = {
  fontSize: 24, fontWeight: 700, color: "var(--n900)",
  fontVariantNumeric: "tabular-nums",
};
const sub: React.CSSProperties = { fontSize: 12, color: "var(--n400)", marginTop: 2 };

export function StatsBar({ data }: { data: AdminOverview }) {
  const paid = (data.plan_counts["desk"] ?? 0) + (data.plan_counts["firm"] ?? 0);
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
      <div style={tile}>
        <div style={label}>Users</div>
        <div style={value}>{data.total_users}</div>
        <div style={sub}>{data.verified_users} verified</div>
      </div>
      <div style={tile}>
        <div style={label}>Paid workspaces</div>
        <div style={value}>{paid}</div>
        <div style={sub}>
          {(data.plan_counts["desk"] ?? 0)} desk · {(data.plan_counts["firm"] ?? 0)} firm
        </div>
      </div>
      <div style={tile}>
        <div style={label}>Memos (all time)</div>
        <div style={value}>{data.reports_total}</div>
        <div style={sub}>{data.reports_30d} in last 30d</div>
      </div>
      <div style={tile}>
        <div style={label}>Credits used (30d)</div>
        <div style={value}>{data.credits_used_30d}</div>
        <div style={sub}>from report runs</div>
      </div>
    </div>
  );
}
