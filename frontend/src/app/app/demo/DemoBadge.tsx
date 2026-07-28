"use client";

/**
 * Corner marker shown whenever demo mode is active, so sample figures are never
 * mistaken for a real agent run. Hidden with `&badge=0` for video capture.
 */
export function DemoBadge() {
  return (
    <div
      aria-hidden="true"
      style={{
        // Bottom-right: the sidebar's user-profile block owns bottom-left.
        position: "fixed", right: 12, bottom: 12, zIndex: 900,
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "5px 10px", borderRadius: 999,
        background: "rgba(9,30,66,0.88)", color: "#fff",
        fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", pointerEvents: "none",
        boxShadow: "0 4px 12px rgba(9,30,66,.25)",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: "#FFAB00" }} />
      Demo data
    </div>
  );
}
