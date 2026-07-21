/** Shared inline styles for the admin screens. Pure data — no React. */

export const card: React.CSSProperties = {
  background: "var(--n0)", border: "1px solid var(--n100)",
  borderRadius: 10, padding: "16px 20px",
};

export const th: React.CSSProperties = {
  textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--n500)",
  textTransform: "uppercase", letterSpacing: "0.04em",
  padding: "8px 10px", borderBottom: "1px solid var(--n100)", whiteSpace: "nowrap",
};

export const td: React.CSSProperties = {
  fontSize: 13, color: "var(--n800)", padding: "10px",
  borderBottom: "1px solid var(--n50)", verticalAlign: "middle",
};

export const input: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 6, border: "1px solid var(--n200)",
  fontSize: 13, outline: "none",
};

export const btn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
  borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
};

export const planBadge = (tier: string): React.CSSProperties => {
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

/** Plans an admin can assign by hand, with their standard credit allowance. */
export const PLAN_TIERS: { value: string; label: string; credits: number }[] = [
  { value: "solo", label: "Solo", credits: 3 },
  { value: "desk", label: "Desk", credits: 50 },
  { value: "firm", label: "Firm", credits: 999_999 },
];
