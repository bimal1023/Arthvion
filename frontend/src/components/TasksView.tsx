"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckSquare, Square, ListChecks, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Spinner } from "./ui";
import type { TaskItem } from "@/lib/types";

/* ── Helpers ────────────────────────────────────────────────── */

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dueMeta(iso: string | null | undefined): { label: string; overdue: boolean } | null {
  if (!iso) return null;
  const due = new Date(iso);
  const days = Math.round((new Date(iso).setHours(0, 0, 0, 0) - startOfToday()) / 86_400_000);
  const label =
    days < 0 ? `Overdue by ${Math.abs(days)}d`
    : days === 0 ? "Due today"
    : days === 1 ? "Due tomorrow"
    : `Due ${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  return { label, overdue: days < 0 };
}

type Group = "overdue" | "upcoming" | "someday";

function groupOf(t: TaskItem): Group {
  if (!t.due_at) return "someday";
  return new Date(t.due_at).setHours(0, 0, 0, 0) < startOfToday() ? "overdue" : "upcoming";
}

const GROUP_META: { key: Group; label: string; accent: string }[] = [
  { key: "overdue",  label: "Overdue",   accent: "var(--red)" },
  { key: "upcoming", label: "Scheduled", accent: "var(--b600)" },
  { key: "someday",  label: "No due date", accent: "var(--n300)" },
];

/* ── Component ──────────────────────────────────────────────── */

export function TasksView({ onOpenPipeline }: { onOpenPipeline?: () => void }) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/api/v1/crm/tasks?status=${showDone ? "all" : "open"}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: TaskItem[]) => setTasks(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [showDone]);

  useEffect(() => { load(); }, [load]);

  async function toggle(t: TaskItem) {
    const completed = !t.completed_at;
    setTasks((prev) => prev.map((x) =>
      x.id === t.id ? { ...x, completed_at: completed ? new Date().toISOString() : null } : x));
    await apiFetch(`/api/v1/interactions/${t.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    }).catch(() => load());
  }

  if (loading && tasks.length === 0) {
    return <div style={{ padding: 40, display: "flex", justifyContent: "center" }}><Spinner /></div>;
  }

  const open = tasks.filter((t) => !t.completed_at);
  const done = tasks.filter((t) => t.completed_at);
  const overdueCount = open.filter((t) => groupOf(t) === "overdue").length;

  return (
    <div style={{ padding: "0 4px", maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--s-200)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "var(--n400)" }}>
            {open.length} open task{open.length === 1 ? "" : "s"}
            {overdueCount > 0 && (
              <span style={{ color: "var(--red)", fontWeight: 600 }}> · {overdueCount} overdue</span>
            )}
          </div>
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--n400)", cursor: "pointer" }}>
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          Show completed
        </label>
      </div>

      {/* Empty state */}
      {open.length === 0 && done.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--n300)" }}>
          <ListChecks size={26} style={{ color: "var(--n200)", marginBottom: 12 }} />
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            No tasks yet. Open a deal in the{" "}
            {onOpenPipeline
              ? <button onClick={onOpenPipeline} style={linkBtn}>Pipeline</button>
              : "Pipeline"}{" "}
            and log a task to see it here.
          </p>
        </div>
      )}

      {/* Grouped open tasks */}
      {GROUP_META.map((g) => {
        const rows = open.filter((t) => groupOf(t) === g.key);
        if (rows.length === 0) return null;
        return (
          <div key={g.key} style={{ marginBottom: "var(--s-250)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: "var(--s-100)" }}>
              {g.key === "overdue" && <AlertTriangle size={13} style={{ color: g.accent }} />}
              <span style={{ fontSize: 11, fontWeight: 700, color: g.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {g.label}
              </span>
              <span style={{ fontSize: 11, color: "var(--n300)" }}>{rows.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rows.map((t) => <TaskRow key={t.id} task={t} onToggle={toggle} />)}
            </div>
          </div>
        );
      })}

      {/* Completed */}
      {showDone && done.length > 0 && (
        <div style={{ marginBottom: "var(--s-250)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--n300)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--s-100)" }}>
            Completed {done.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {done.map((t) => <TaskRow key={t.id} task={t} onToggle={toggle} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Subcomponents ──────────────────────────────────────────── */

function TaskRow({ task, onToggle }: { task: TaskItem; onToggle: (t: TaskItem) => void }) {
  const done = !!task.completed_at;
  const due = dueMeta(task.due_at);
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: "var(--s-150)",
      border: "1px solid var(--n30)", borderRadius: "var(--r-2)", background: "var(--n0)",
    }}>
      <button type="button" onClick={() => onToggle(task)} title={done ? "Mark incomplete" : "Mark complete"}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: done ? "var(--g600)" : "var(--n300)", flexShrink: 0, marginTop: 1 }}>
        {done ? <CheckSquare size={16} /> : <Square size={16} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, color: "var(--n800)", lineHeight: 1.45, wordBreak: "break-word",
          textDecoration: done ? "line-through" : "none", opacity: done ? 0.55 : 1,
        }}>{task.body}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 10.5, fontWeight: 700, color: "var(--b700)", background: "var(--b50)",
            padding: "1px 6px", borderRadius: "var(--r-1)",
          }}>{task.deal_company}</span>
          {due && (
            <span style={{ fontSize: 11, fontWeight: 600, color: due.overdue && !done ? "var(--red)" : "var(--n300)" }}>
              {due.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  background: "none", border: "none", padding: 0, color: "var(--b600)",
  fontWeight: 600, cursor: "pointer", fontSize: "inherit",
};
