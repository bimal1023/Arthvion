"use client";

import { useEffect, useRef, useState } from "react";
import {
  Zap, FileText, Activity as ActivityIcon, Star, Mic, BarChart2 as CompsIcon,
  Filter, Layers, Lock, ListChecks,
  Folder, FileCode, Globe2, Users, TrendingUp, Settings as SettingsIcon,
  Search, ChevronDown, ChevronRight, LogOut,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import type { NavTab } from "../types";

const PLAN_LABEL: Record<string, string> = { solo: "Solo", desk: "Desk", firm: "Firm" };

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (t: NavTab) => void;
  userName: string;
  onSearchOpen: () => void;
  recentCount: number;
  /** Reports currently running or queued — shown as a green "live" badge. Hidden at zero. */
  liveCount?: number;
  /** Uploaded source documents in the knowledge base. Hidden at zero. */
  docCount?: number;
  watchlistAlertCount?: number;
  /** Memo-usage percent for the Usage badge. `null` = unlimited/unknown (badge hidden). */
  usagePercent?: number | null;
  planTier: string;
  teamMemberCount?: number;
  workspaceRole?: string;
  /** Firm / workspace name shown under the product name. Falls back to a dash while loading. */
  workspaceName?: string;
  /** Sign the user out — invoked from the workspace menu. */
  onSignOut?: () => void;
}

/** Usage badge color by load: calm green, warning yellow, hot red. */
function usageBadge(pct: number) {
  if (pct >= 90) return { background: "var(--red)", color: "#fff" };
  if (pct >= 70) return { background: "var(--amber)", color: "#fff" };
  return undefined; // falls back to the .green badge class
}

export function Sidebar({
  activeTab, onTabChange, userName, onSearchOpen, recentCount, liveCount, docCount, watchlistAlertCount, usagePercent, planTier, teamMemberCount, workspaceRole, workspaceName, onSignOut,
}: SidebarProps) {
  const isSolo = planTier === "solo";
  const lockBadge = <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 5, color: "var(--n300)", flexShrink: 0 }}><Lock size={11} /></span>;
  const initials = userName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const [menuOpen, setMenuOpen] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMenuOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  const go = (tab: NavTab) => { setMenuOpen(false); onTabChange(tab); };

  return (
    <aside className="sidebar">
      {/* Brand — click opens the workspace menu */}
      <div className="sb-brand-wrap" ref={brandRef}>
        <button
          type="button"
          className="sb-brand"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <div className="sb-mark"><Logo variant="onDark" size={24} /></div>
          <div className="sb-brand-text">
            <div className="sb-brand-name">Arthvion</div>
            <div className="sb-brand-sub">{workspaceName?.trim() || "—"}</div>
          </div>
          <ChevronDown size={14} className={`sb-chev${menuOpen ? " open" : ""}`} />
        </button>

        {menuOpen && (
          <div className="sb-menu" role="menu">
            <div className="sb-menu-head">
              <div className="sb-menu-ws">{workspaceName?.trim() || "Your workspace"}</div>
              <div className="sb-menu-meta">
                <span className={`sb-menu-plan plan-${planTier}`}>{PLAN_LABEL[planTier] ?? planTier}</span>
                {workspaceRole && <span className="sb-menu-role">{workspaceRole}</span>}
              </div>
            </div>
            <button type="button" className="sb-menu-item" role="menuitem" onClick={() => go("settings")}>
              <SettingsIcon size={14} /> Settings
            </button>
            <button type="button" className="sb-menu-item" role="menuitem" onClick={() => go("team")}>
              <Users size={14} /> Team
            </button>
            <button type="button" className="sb-menu-item" role="menuitem" onClick={() => go("usage")}>
              <TrendingUp size={14} /> Usage &amp; billing
            </button>
            {onSignOut && (
              <>
                <div className="sb-menu-divider" />
                <button type="button" className="sb-menu-item danger" role="menuitem" onClick={() => { setMenuOpen(false); onSignOut(); }}>
                  <LogOut size={14} /> Sign out
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="sb-search-wrap">
        <button className="sb-search" onClick={onSearchOpen} type="button">
          <Search size={14} />
          <span style={{ flex: 1, textAlign: "left" }}>Search memos, tickers…</span>
          <span className="kbd">⌘K</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {/* Top group */}
        <NavItem icon={Zap}          label="New report"   tab="new-report"   active={activeTab} onClick={onTabChange} badge={<span className="sb-badge kbd-tone">N</span>} />
        <NavItem icon={FileText}     label="Memos"        tab="memos"        active={activeTab} onClick={onTabChange} badge={<span className="sb-badge">{recentCount}</span>} />
        <NavItem icon={ActivityIcon} label="Live monitor" tab="live-monitor" active={activeTab} onClick={onTabChange} badge={liveCount ? <span className="sb-badge green">{liveCount}</span> : undefined} />
        <NavItem icon={Star}         label="Portfolio"    tab="watchlist"    active={activeTab} onClick={onTabChange} badge={watchlistAlertCount ? <span className="sb-badge" style={{ background: "var(--red)", color: "#fff" }}>{watchlistAlertCount}</span> : undefined} />
        <NavItem icon={Layers}       label="Pipeline"     tab="pipeline"     active={activeTab} onClick={onTabChange} />
        <NavItem icon={ListChecks}   label="Tasks"        tab="tasks"        active={activeTab} onClick={onTabChange} />
        <NavItem icon={Mic}          label="Earnings"     tab="earnings"     active={activeTab} onClick={onTabChange} badge={isSolo ? lockBadge : undefined} />
        <NavItem icon={CompsIcon}   label="Comps"        tab="comps"        active={activeTab} onClick={onTabChange} badge={isSolo ? lockBadge : undefined} />
        <NavItem icon={Filter}      label="Screener"     tab="screener"     active={activeTab} onClick={onTabChange} badge={isSolo ? lockBadge : undefined} />

        {/* Library */}
        <div className="sb-group-label">Library</div>
        <NavItem icon={Folder}   label="Knowledge base" tab="knowledge-base" active={activeTab} onClick={onTabChange} badge={docCount ? <span className="sb-badge">{docCount}</span> : undefined} />
        <NavItem icon={FileCode} label="Templates"      tab="templates"      active={activeTab} onClick={onTabChange} />
        <NavItem icon={Globe2}   label="Citations"      tab="citations"      active={activeTab} onClick={onTabChange} />

        {/* Desk */}
        <div className="sb-group-label">Desk</div>
        <NavItem icon={ActivityIcon} label="Activity" tab="activity" active={activeTab} onClick={onTabChange} />
        <NavItem icon={Users}        label="Team"     tab="team"     active={activeTab} onClick={onTabChange} badge={teamMemberCount && teamMemberCount > 1 ? <span className="sb-badge">{teamMemberCount}</span> : undefined} />
        <NavItem icon={TrendingUp}   label="Usage"    tab="usage"    active={activeTab} onClick={onTabChange} badge={typeof usagePercent === "number" ? <span className="sb-badge green" style={usageBadge(usagePercent)}>{usagePercent}%</span> : undefined} />
        <NavItem icon={SettingsIcon} label="Settings" tab="settings" active={activeTab} onClick={onTabChange} />
      </nav>

      {/* User */}
      <div className="sb-user">
        <div className="sb-avatar">{initials || "U"}</div>
        <div className="sb-user-text">
          <div className="sb-user-name">{userName || "User"}</div>
          <div className="sb-user-role">{workspaceRole ? workspaceRole.charAt(0).toUpperCase() + workspaceRole.slice(1) : "Analyst"} · {planTier === "solo" ? "Solo" : planTier === "desk" ? "Desk" : "Firm"}</div>
        </div>
        <ChevronDown size={14} style={{ color: "var(--n100)", flexShrink: 0 }} />
      </div>
    </aside>
  );
}

function NavItem({
  icon: Icon, label, tab, active, onClick, badge,
}: {
  icon: React.FC<{ size?: number }>;
  label: string; tab: NavTab; active: NavTab;
  onClick: (t: NavTab) => void;
  badge?: React.ReactNode;
}) {
  const on = active === tab;
  return (
    <button
      type="button"
      className={`sb-item${on ? " active" : ""}`}
      onClick={() => onClick(tab)}
    >
      <span className="sb-icon-wrap"><Icon size={15} /></span>
      <span className="sb-label">{label}</span>
      {badge}
    </button>
  );
}
