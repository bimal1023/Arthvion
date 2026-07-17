"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Plus, Loader2, Check, X } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import type { AdminUser } from "../types";

const card: React.CSSProperties = {
  background: "var(--n0)", border: "1px solid var(--n100)",
  borderRadius: 10, padding: "16px 20px",
};
const th: React.CSSProperties = {
  textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--n500)",
  textTransform: "uppercase", letterSpacing: "0.04em",
  padding: "8px 10px", borderBottom: "1px solid var(--n100)", whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  fontSize: 13, color: "var(--n800)", padding: "10px",
  borderBottom: "1px solid var(--n50)", verticalAlign: "middle",
};
const planBadge = (tier: string): React.CSSProperties => {
  const map: Record<string, { bg: string; fg: string }> = {
    solo: { bg: "var(--n50)", fg: "var(--n600)" },
    desk: { bg: "var(--b50)", fg: "var(--b700)" },
    firm: { bg: "var(--p50)", fg: "var(--p700)" },
  };
  const c = map[tier] ?? map.solo;
  return {
    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
    background: c.bg, color: c.fg, textTransform: "capitalize",
  };
};
const input: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 6, border: "1px solid var(--n200)",
  fontSize: 13, outline: "none",
};
const btn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
  borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function UsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grantFor, setGrantFor] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState("10");
  const [granting, setGranting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/admin/users${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const grant = async (userId: string) => {
    const credits = parseInt(grantAmount, 10);
    if (!credits || credits < 1) return;
    setGranting(true);
    try {
      const res = await apiFetch(`/api/v1/admin/users/${userId}/credits`, {
        method: "POST",
        body: JSON.stringify({ credits }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, memo_credits: data.memo_credits } : u)),
        );
        setFlash(`Added ${credits} credits.`);
        setTimeout(() => setFlash(null), 2500);
        setGrantFor(null);
      }
    } finally {
      setGranting(false);
    }
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--n400)" }} />
          <input
            style={{ ...input, paddingLeft: 30, width: "100%" }}
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void load(search); }}
          />
        </div>
        <button style={{ ...btn, background: "var(--n20)", color: "var(--n700)" }} onClick={() => void load(search)}>
          Search
        </button>
        {flash && <span style={{ fontSize: 12, color: "var(--g600, #0A6640)", fontWeight: 600 }}>{flash}</span>}
      </div>

      {loading ? (
        <div style={{ padding: 30, textAlign: "center", color: "var(--n400)" }}>
          <Loader2 size={18} className="af-spin" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>User</th>
                <th style={th}>Plan</th>
                <th style={th}>Credits</th>
                <th style={th}>Memos 30d</th>
                <th style={th}>Memos total</th>
                <th style={th}>Last memo</th>
                <th style={th}>Joined</th>
                <th style={th}>Verified</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 600, color: "var(--n900)" }}>{u.email}</div>
                    {u.full_name && <div style={{ fontSize: 12, color: "var(--n400)" }}>{u.full_name}</div>}
                  </td>
                  <td style={td}><span style={planBadge(u.plan_tier)}>{u.plan_tier}</span></td>
                  <td style={{ ...td, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                    {u.memo_credits >= 999_999 ? "∞" : u.memo_credits}
                  </td>
                  <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{u.reports_30d}</td>
                  <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{u.reports_total}</td>
                  <td style={td}>{fmtDate(u.last_report_at)}</td>
                  <td style={td}>{fmtDate(u.created_at)}</td>
                  <td style={td}>
                    {u.is_verified
                      ? <Check size={14} style={{ color: "#0A6640" }} />
                      : <X size={14} style={{ color: "var(--n300)" }} />}
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {grantFor === u.id ? (
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <input
                          style={{ ...input, width: 70, padding: "5px 8px" }}
                          type="number" min={1} max={10000}
                          value={grantAmount}
                          onChange={(e) => setGrantAmount(e.target.value)}
                          autoFocus
                        />
                        <button
                          style={{ ...btn, background: "var(--b600)", color: "#fff" }}
                          disabled={granting}
                          onClick={() => void grant(u.id)}
                        >
                          {granting ? "…" : "Add"}
                        </button>
                        <button
                          style={{ ...btn, background: "transparent", color: "var(--n400)", padding: 4 }}
                          onClick={() => setGrantFor(null)}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ) : (
                      <button
                        style={{ ...btn, background: "var(--n20)", color: "var(--n700)" }}
                        onClick={() => { setGrantFor(u.id); setGrantAmount("10"); }}
                      >
                        <Plus size={13} /> Credits
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td style={{ ...td, textAlign: "center", color: "var(--n400)" }} colSpan={9}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
