"use client";

import { useCallback, useEffect, useState } from "react";
import { Ticket, Trash2, Copy, Check, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import type { AdminVoucher } from "../types";

const card: React.CSSProperties = {
  background: "var(--n0)", border: "1px solid var(--n100)",
  borderRadius: 10, padding: "16px 20px", marginBottom: 16,
};
const label: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "var(--n600)", display: "block", marginBottom: 4,
};
const input: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 6, border: "1px solid var(--n200)",
  fontSize: 13, outline: "none", width: "100%",
};
const btn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
  borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
};
const th: React.CSSProperties = {
  textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--n500)",
  textTransform: "uppercase", letterSpacing: "0.04em",
  padding: "8px 10px", borderBottom: "1px solid var(--n100)", whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  fontSize: 13, color: "var(--n800)", padding: "10px",
  borderBottom: "1px solid var(--n50)",
};

export function VouchersPanel() {
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState("10");
  const [maxRedemptions, setMaxRedemptions] = useState("1");
  const [expiresDays, setExpiresDays] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/admin/vouchers");
      if (res.ok) setVouchers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setError(null);
    const body: Record<string, unknown> = {
      credits: parseInt(credits, 10) || 0,
      max_redemptions: parseInt(maxRedemptions, 10) || 1,
    };
    if (expiresDays) body.expires_in_days = parseInt(expiresDays, 10);
    if (customCode.trim()) body.code = customCode.trim();
    if (note.trim()) body.note = note.trim();

    setCreating(true);
    try {
      const res = await apiFetch("/api/v1/admin/vouchers", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const v: AdminVoucher = await res.json();
        setVouchers((prev) => [v, ...prev]);
        setCustomCode(""); setNote("");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail ?? "Could not create voucher.");
      }
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    const res = await apiFetch(`/api/v1/admin/vouchers/${id}`, { method: "DELETE" });
    if (res.ok) setVouchers((prev) => prev.filter((v) => v.id !== id));
  };

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <>
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--n900)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Ticket size={16} /> Create voucher
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "0 0 100px" }}>
            <label style={label}>Credits</label>
            <input style={input} type="number" min={1} value={credits} onChange={(e) => setCredits(e.target.value)} />
          </div>
          <div style={{ flex: "0 0 110px" }}>
            <label style={label}>Max uses</label>
            <input style={input} type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} />
          </div>
          <div style={{ flex: "0 0 120px" }}>
            <label style={label}>Expires (days)</label>
            <input style={input} type="number" min={1} placeholder="never" value={expiresDays} onChange={(e) => setExpiresDays(e.target.value)} />
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <label style={label}>Custom code (optional)</label>
            <input style={input} placeholder="auto-generated" value={customCode} onChange={(e) => setCustomCode(e.target.value)} />
          </div>
          <div style={{ flex: "1 1 180px" }}>
            <label style={label}>Note (optional)</label>
            <input style={input} placeholder="e.g. Beta tester reward" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button
            style={{ ...btn, background: "var(--b600)", color: "#fff" }}
            disabled={creating}
            onClick={() => void create()}
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
        {error && <div style={{ marginTop: 10, fontSize: 12, color: "#B41C2A", fontWeight: 600 }}>{error}</div>}
      </div>

      <div style={card}>
        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--n400)" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Code</th>
                  <th style={th}>Credits</th>
                  <th style={th}>Redeemed</th>
                  <th style={th}>Expires</th>
                  <th style={th}>Note</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v.id}>
                    <td style={{ ...td, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {v.code}
                        <button
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--n400)", padding: 2 }}
                          onClick={() => void copy(v.code)}
                          title="Copy code"
                        >
                          {copied === v.code ? <Check size={13} style={{ color: "#0A6640" }} /> : <Copy size={13} />}
                        </button>
                      </span>
                    </td>
                    <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{v.credits}</td>
                    <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>
                      {v.redeemed_count} / {v.max_redemptions}
                    </td>
                    <td style={td}>
                      {v.expires_at ? new Date(v.expires_at).toLocaleDateString() : "never"}
                    </td>
                    <td style={{ ...td, color: "var(--n500)" }}>{v.note ?? "—"}</td>
                    <td style={td}>
                      <button
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--n400)", padding: 4 }}
                        onClick={() => void remove(v.id)}
                        title="Delete voucher"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {vouchers.length === 0 && (
                  <tr><td style={{ ...td, textAlign: "center", color: "var(--n400)" }} colSpan={6}>No vouchers yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
