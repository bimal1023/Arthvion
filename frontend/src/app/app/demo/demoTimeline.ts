/**
 * Scripted event timeline for demo mode (`/app?demo=1`).
 *
 * Mirrors the shape of the real Redis SSE stream (`agent_start`, `status`,
 * `agent_done`) so `useReportRun` can drive the exact same state — and
 * therefore the exact same UI — from a local clock instead of the network.
 *
 * Tuned for filming, not for realism: a real parallel run finishes in a clump
 * around the 2–4 minute mark, which reads as nothing happening followed by
 * everything happening. Here the four agents resolve one at a time so a viewer
 * can actually watch each one land. Total runtime ~18s before the memo appears.
 *
 * Adjust pace at runtime with `?demo=1&speed=1.5` rather than editing times here.
 */
import type { AgentKey } from "../types";

export interface DemoStep {
  /** Seconds from run start (before the speed multiplier is applied). */
  at: number;
  type: "status" | "agent_start" | "agent_log" | "agent_done";
  agent?: AgentKey;
  message?: string;
  confidence?: number;
}

export const DEMO_STEPS: DemoStep[] = [
  { at: 0.0,  type: "status", message: "Dispatching four specialist agents…" },

  { at: 0.5,  type: "agent_start", agent: "financial" },
  { at: 0.9,  type: "agent_start", agent: "risk" },
  { at: 1.3,  type: "agent_start", agent: "market" },
  { at: 1.7,  type: "agent_start", agent: "legal" },
  { at: 2.0,  type: "status", message: "Four agents running in parallel — SEC EDGAR, web, court records" },

  { at: 2.4,  type: "agent_log", agent: "financial", message: "Resolving CIK 0000320193 — Apple Inc." },
  { at: 2.8,  type: "agent_log", agent: "market",    message: "Searching market sizing sources…" },
  { at: 3.2,  type: "agent_log", agent: "risk",      message: "Fetching 10-K FY2024 · Item 1A" },
  { at: 3.6,  type: "agent_log", agent: "legal",     message: "Querying CourtListener RECAP dockets…" },

  { at: 4.4,  type: "agent_log", agent: "financial", message: "Pulling XBRL company facts — 14 concepts" },
  { at: 5.0,  type: "agent_log", agent: "risk",      message: "Parsing 8-K filings, trailing 12 months" },
  { at: 5.6,  type: "agent_log", agent: "market",    message: "Cross-checking IDC + Counterpoint share data" },
  { at: 6.2,  type: "agent_log", agent: "legal",     message: "Screening sanctions and PEP lists — no hits" },

  { at: 6.8,  type: "agent_log", agent: "financial", message: "Reconciling segment revenue to consolidated total" },
  { at: 7.4,  type: "agent_log", agent: "financial", message: "Writing 4 citations" },
  { at: 8.0,  type: "agent_done", agent: "financial", confidence: 0.94 },

  { at: 8.6,  type: "agent_log", agent: "market",    message: "Mapping competitor set — 4 named peers" },
  { at: 9.4,  type: "agent_log", agent: "risk",      message: "Scoring 6 risk factors by severity" },
  { at: 10.2, type: "agent_done", agent: "market",   confidence: 0.83 },

  { at: 11.0, type: "agent_log", agent: "legal",     message: "Reading US v. Apple, No. 2:24-cv-04055" },
  { at: 11.6, type: "agent_log", agent: "risk",      message: "Cross-referencing concentration disclosures" },
  { at: 12.4, type: "agent_done", agent: "risk",     confidence: 0.91 },

  { at: 13.2, type: "agent_log", agent: "legal",     message: "Summarising 3 regulatory matters" },
  { at: 14.4, type: "agent_done", agent: "legal",    confidence: 0.88 },

  { at: 15.0, type: "status", message: "Synthesising four specialist outputs…" },
  { at: 16.4, type: "status", message: "Scoring conviction and reconciling 14 citations…" },
  { at: 18.0, type: "status", message: "Analysis complete — loading report…" },
];

/** Wall-clock length of the scripted run, before the speed multiplier. */
export const DEMO_DURATION_S = 18.0;

/**
 * Start/end second for each agent, derived from the steps above so the progress
 * bars stay in sync with the script if the timings are edited.
 */
export function demoAgentWindows(): Record<string, { start: number; end: number }> {
  const out: Record<string, { start: number; end: number }> = {};
  for (const s of DEMO_STEPS) {
    if (!s.agent) continue;
    if (s.type === "agent_start") out[s.agent] = { start: s.at, end: s.at + 1 };
    else if (s.type === "agent_done" && out[s.agent]) out[s.agent].end = s.at;
  }
  return out;
}
