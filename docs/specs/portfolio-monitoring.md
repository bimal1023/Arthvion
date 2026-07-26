# Spec: Portfolio Monitoring Module

**Status:** Draft · **Owner:** TBD · **Target version:** 0.2.0

## 1. Goal

Give PE firms a place to monitor the companies they **own** (not just targets
they're diligencing): ingest monthly/quarterly reporting packs, auto-extract
KPIs into a time series, track actuals vs. plan, and fire alerts on material
drift (margin compression, covenant breach risk, new litigation, guidance
changes). Extends the diligence relationship past the one-time deal into a
recurring, sticky surface — the highest-leverage move for retention and ARR.

**One-liner:** *Your portfolio watches itself — KPIs, risks, and board decks, on autopilot.*

## 2. Why this wins

Diligence is a one-time purchase; monitoring is a subscription. Firms already
collect monthly reporting packs from portfolio companies and burn analyst hours
re-keying them into spreadsheets and writing board updates. We already have the
two hard pieces — a document ingestion pipeline and an autonomous scanning agent
loop — pointed at the wrong stage. Repointing them at owned companies is high
value for low marginal build.

## 3. What already exists (reuse, don't rebuild)

| Existing | File | Reuse for monitoring |
|---|---|---|
| `WatchlistItem` (scan_frequency, last_scan_at, last_drift_at, baseline_report_id) | `backend/models/db.py:286` | Template for a `PortfolioCompany` record |
| `DriftAgent` (Tier-1 change detection) | `backend/agents/drift_agent.py` | Risk/news drift on owned companies |
| `run_watchlist_scan` / `run_drift_check` (Celery beat) | `backend/tasks/watchlist_tasks.py` | Periodic scan scheduler |
| `DriftEvent` + `WatchlistAuditLog` | `backend/models/db.py:344,366` | Alert/event storage pattern |
| Document ingestion (PDF/CSV/XLSX/DOCX) + pgvector | `backend/api/upload_routes.py`, `mcp_servers/pgvector_rag` | Ingest reporting packs |
| SEC/web/FRED MCP servers | `mcp_servers/` | Macro + filing context per holding |
| Redis SSE + notifications | `backend/core`, `NotificationsDropdown` | Live alerts to the UI |

## 4. New data model

Additions to `backend/models/db.py`, all `workspace_id`-scoped.

### 4.1 `PortfolioCompany`
An owned company (distinct from a watchlist target or a pipeline deal, though it
may originate from a closed `Deal`).

```
id, workspace_id, user_id (owner)
company, ticker (nullable — most are private)
deal_id -> deals.id (SET NULL)          # provenance: which deal became this holding
ownership_pct, invested_amount_usd, entry_date, entry_valuation_usd  (nullable)
status            # "active" | "exited"
scan_frequency    # "weekly" | "monthly"
last_scan_at, last_alert_at
created_at, updated_at
```

### 4.2 `KpiDefinition` (per portfolio company)
```
id, workspace_id, portfolio_company_id
name              # "Revenue", "EBITDA", "Cash", "MRR", "Headcount", ...
unit              # "usd" | "pct" | "count" | "ratio"
target_direction  # "up" | "down"  — which way is good
created_at
```

### 4.3 `KpiObservation` (time series)
```
id, portfolio_company_id, kpi_definition_id
period            # "2026-06" (month) or "2026-Q2"
actual            # float
plan              # float (nullable — budget/forecast)
source_document_id -> documents.id (nullable)  # provenance for the number
extracted_by      # "agent" | "manual"
created_at
UNIQUE(kpi_definition_id, period)
```

### 4.4 `PortfolioAlert`
```
id, workspace_id, portfolio_company_id
severity          # "high" | "medium" | "low"
category          # "kpi_drift" | "covenant" | "litigation" | "news" | "guidance"
title, detail
kpi_definition_id (nullable), source (nullable)
acknowledged_at (nullable)
created_at
```

## 5. Pipelines

### 5.1 Reporting-pack ingestion → KPIs
1. User uploads a monthly pack to a portfolio company (reuse
   `POST /documents` with a `portfolio_company_id` association).
2. A **KPI extraction agent** (new, but mirrors the specialist loop pattern in
   `backend/agents/`) reads the pack via the file-ingest / pgvector tools and
   returns a structured `{kpi_name, period, actual, plan}[]` with per-number
   citations to the source document.
3. Observations are upserted into `KpiObservation` (idempotent on
   `(kpi_definition_id, period)`).
4. Compare actual vs. plan and vs. prior period → generate `PortfolioAlert`
   rows on threshold breaches.

### 5.2 Periodic risk drift (reuse watchlist machinery)
- A Celery-beat task (`run_portfolio_scan`, modeled on `run_watchlist_scan`)
  dispatches per-company drift checks on `scan_frequency`.
- `DriftAgent` (or a thin subclass) sweeps SEC/web/CourtListener/OpenSanctions
  for new litigation, sanctions, guidance/news changes → `PortfolioAlert`.
- Fan-out across the whole portfolio in one scheduled run = "portfolio-wide risk
  radar."

### 5.3 Board-deck / quarterly-update draft
- `POST /portfolio/{id}/board-update` → an agent composes a quarterly update
  from the KPI time series + open alerts + recent filings, in a firm template.
  Reuses the synthesis-prompt pattern from the orchestrator.

## 6. API surface (new, under `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/portfolio` | list / add holdings |
| GET/PATCH/DELETE | `/portfolio/{id}` | holding detail |
| POST | `/portfolio/{id}/ingest` | upload+extract a reporting pack (202 + SSE) |
| GET | `/portfolio/{id}/kpis` | KPI definitions + time series |
| POST/PATCH | `/portfolio/{id}/kpis` | define / correct a KPI or observation |
| GET | `/portfolio/{id}/alerts` | alerts for one holding |
| POST | `/portfolio/alerts/{id}/ack` | acknowledge |
| GET | `/portfolio/alerts` | portfolio-wide alert inbox |
| POST | `/portfolio/{id}/board-update` | draft board/quarterly update |
| POST | `/portfolio/{id}/scan` | force a drift scan now |

## 7. Frontend

- **`PortfolioView.tsx`** — new sidebar tab `portfolio`: holdings table with
  status, last KPI period, open-alert count, mini-trend sparklines (reuse
  `Sparkline` from `ui.tsx`).
- **Holding detail** — KPI charts (actual vs. plan over time), alert feed,
  documents, "Generate board update" button.
- **Alerts inbox** — portfolio-wide, feeds `NotificationsDropdown`.
- Charts/tiles must follow the `dataviz` skill conventions and the scoped-token
  design system (no Tailwind). Respect `≤300-line` file rule.

## 8. Phasing

- **MVP (v0.2.0):** `PortfolioCompany` + KPI models, reporting-pack ingestion →
  KPI extraction with citations, KPI charts vs. plan, manual KPI correction.
- **v2:** periodic drift scan reusing watchlist machinery, portfolio-wide alert
  inbox, covenant thresholds.
- **v3:** board-update drafting, exit-readiness scoring, LP-facing rollups.

## 9. Reuse map (build vs. borrow)

- **Borrow wholesale:** document ingestion, pgvector RAG, Celery beat schedule,
  DriftAgent loop, DriftEvent/alert storage, SSE + notifications, Sparkline UI.
- **Build new:** KPI extraction agent (structured output + citations), KPI
  time-series models, PortfolioView UI, board-update synthesis prompt.

## 10. Open questions

1. Does a `PortfolioCompany` always originate from a closed `Deal`, or can it be
   added standalone? (Leaning: both — `deal_id` nullable.)
2. KPI schema: fully freeform per company, or a curated starter set (Revenue /
   EBITDA / Cash / Headcount) users extend? (Leaning: starter set + freeform.)
3. Extraction confidence — do we require human confirmation before a number
   enters the time series, or auto-accept with an "unverified" flag? (Leaning:
   auto-accept + flag, matching the citations-grade-trust principle.)
4. Covenant tracking — generic threshold rules in v1, or model actual debt
   covenants? (Leaning: generic thresholds first.)
