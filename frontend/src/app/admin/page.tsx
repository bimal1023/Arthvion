"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Users, Ticket, ArrowLeft, Loader2 } from "lucide-react";

import { Logo } from "@/components/Logo";
import { apiFetch, getToken } from "@/lib/auth";
import { CSS } from "../app/css";

import type { AdminOverview } from "./types";
import { StatsBar } from "./components/StatsBar";
import { UsersTable } from "./components/UsersTable";
import { VouchersPanel } from "./components/VouchersPanel";

type Tab = "users" | "vouchers";

const tabBtn = (active: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
  borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
  border: "none",
  background: active ? "var(--b50)" : "transparent",
  color: active ? "var(--b700)" : "var(--n500)",
});

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [tab, setTab] = useState<Tab>("users");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/admin");
      return;
    }
    // Server is the real gate — a non-admin gets 403 here and is sent to /app
    void (async () => {
      const res = await apiFetch("/api/v1/admin/overview");
      if (res.status === 403) {
        router.replace("/app");
        return;
      }
      if (res.ok) setOverview(await res.json());
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="af-app" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--n10)" }}>
          <Loader2 size={22} style={{ color: "var(--n400)", animation: "spin 1s linear infinite" }} />
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="af-app" style={{ minHeight: "100vh", background: "var(--n10)", display: "block", overflow: "auto" }}>
        {/* Header */}
        <header style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 28px",
          background: "var(--n0)", borderBottom: "1px solid var(--n100)",
        }}>
          <Logo size={22} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: "var(--n900)" }}>
            <ShieldCheck size={16} style={{ color: "var(--b600)" }} /> Admin console
          </span>
          <div style={{ flex: 1 }} />
          <Link href="/app" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--b600)", textDecoration: "none" }}>
            <ArrowLeft size={14} /> Back to app
          </Link>
        </header>

        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 28px 60px" }}>
          {overview && <StatsBar data={overview} />}

          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            <button style={tabBtn(tab === "users")} onClick={() => setTab("users")}>
              <Users size={14} /> Users
            </button>
            <button style={tabBtn(tab === "vouchers")} onClick={() => setTab("vouchers")}>
              <Ticket size={14} /> Vouchers
            </button>
          </div>

          {tab === "users" ? <UsersTable /> : <VouchersPanel />}
        </main>
      </div>
    </>
  );
}
