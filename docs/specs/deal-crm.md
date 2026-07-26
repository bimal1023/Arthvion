# Spec: AI-Native Deal CRM

**Status:** Draft · **Owner:** TBD · **Target version:** 0.2.0

## 1. Goal

Turn the existing kanban pipeline (`PipelineView` + `Deal`) into a real deal CRM
for PE / search / corp-dev teams — contacts, activity history, tasks, and a
relationship graph — **without rebuilding Salesforce**. The differentiator is
that the CRM is wired to Arthvion's agents: any deal record can generate a
screening memo, auto-enrich itself with financials and news, and surface
warm-intro paths. We own the *intelligence layer*, not the system of record.

**One-liner:** *The CRM where the numbers are already in the record and the memos write themselves.*

## 2. Why this wins (vs DealCloud / Affinity / Salesforce)

Incumbents are contact databases with weak, bolted-on AI. Our edge is the
reverse: a diligence engine that happens to have a CRM around it. No other CRM
can turn a one-line deal into a cited screening memo in three minutes. That is
the wedge — everything else (stages, contacts, activity) is table stakes we get
cheaply by extending what already exists.

## 3. What already exists (reuse, don't rebuild)

| Existing | File | Reuse for CRM |
|---|---|---|
| `Deal` model (stage, position, conviction, deal_size_usd, notes, report_id) | `backend/models/db.py:495` | Core CRM record — extend, don't replace |
| Deal CRUD + `/deals/{id}/deep-dive` | `backend/api/deals_routes.py` | Base API; deep-dive already generates a report and advances stage |
| `PIPELINE_STAGES` (sourced→…→won/passed) | `backend/models/deals.py:7` | Pipeline columns |
| `PipelineView` kanban | `frontend/src/components/PipelineView.tsx` | Board UI to extend with a detail drawer |
| `Comment` (polymorphic to `deal`) | `backend/models/db.py` | Deal-level notes/threads already work |
| `ActivityEvent` | `backend/models/db.py:584` | Activity feed backbone |
| Orchestrator + specialists | `backend/agents/` | "Generate screening memo" from a record |

## 4. New data model

Additions to `backend/models/db.py`. All tables carry `workspace_id` for tenant
isolation (matching existing patterns).

### 4.1 `Contact`
People associated with deals — founders, management, bankers, brokers, lenders,
co-investors.

```
id, workspace_id, user_id (owner)
full_name, email, phone, title, organization
contact_type      # "founder" | "management" | "intermediary" | "lender" | "co_investor" | "advisor" | "other"
linkedin_url, notes
enrichment_json    # agent-populated: background, recent news, prior deals (nullable)
last_enriched_at
created_at, updated_at
```

### 4.2 `DealContact` (many-to-many link)
```
id, workspace_id
deal_id  -> deals.id (CASCADE)
contact_id -> contacts.id (CASCADE)
role_on_deal   # "seller" | "banker" | "referrer" | "counsel" | ...
UNIQUE(deal_id, contact_id)
```

### 4.3 `Interaction` (activity log per deal/contact)
```
id, workspace_id, user_id
deal_id (nullable), contact_id (nullable)
kind         # "note" | "call" | "email" | "meeting" | "task"
body
occurred_at
due_at       # for kind="task" — drives reminders (nullable)
completed_at # for tasks (nullable)
created_at
```

### 4.4 Extend `Deal`
Add columns (all nullable / defaulted so migration is additive):
```
source           # "inbound" | "proprietary" | "intermediary" | "referral"
referrer_contact_id -> contacts.id (SET NULL)   # which banker/broker sent it
next_action       # free text
next_action_at    # date — powers "needs attention" sorting
priority          # "high" | "medium" | "low"  (distinct from `conviction`)
thesis_fit_score  # 0-100, agent-scored against the firm's thesis (nullable)
```

> Tables auto-create via `Base.metadata.create_all` on startup (per project
> convention) — no Alembic migration needed for greenfield, but note the
> additive columns for existing rows.

## 5. The killer feature — "Generate screening memo from a record"

A lighter-weight sibling of a full report, runnable directly from a deal card.

- **Trigger:** `POST /deals/{id}/screen`
- **Flow:** reuse the orchestrator but with a **screening profile** — fewer
  iterations, shorter output, focused on go/no-go: quick financial snapshot,
  top 3 risks, thesis-fit rationale, and a recommended next step.
- **Output:** a compact `ScreeningMemo` persisted and linked to the deal
  (reuse `report_id` or add `screening_report_id`), plus an updated
  `thesis_fit_score`.
- **Reuse:** same Celery dispatch as `deep_dive` (`deals_routes.py:155`), same
  SSE progress channel, same agents. This is ~a config variant of the existing
  report run, not new agent code.

Auto-enrichment (contacts/deals) uses the same agent infra on demand:
`POST /contacts/{id}/enrich` and `POST /deals/{id}/enrich` populate the
`enrichment_json` / financial snapshot fields.

## 6. API surface (new, under `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/contacts` | list / create contacts |
| GET/PATCH/DELETE | `/contacts/{id}` | contact detail |
| POST | `/contacts/{id}/enrich` | agent background enrichment |
| POST | `/deals/{id}/contacts` | link a contact to a deal |
| DELETE | `/deals/{id}/contacts/{contact_id}` | unlink |
| GET/POST | `/deals/{id}/interactions` | activity log (notes/calls/tasks) |
| PATCH | `/interactions/{id}` | complete a task / edit |
| POST | `/deals/{id}/screen` | generate screening memo (202 + SSE) |
| POST | `/deals/{id}/enrich` | auto-populate financials/news |
| GET | `/crm/tasks` | all open tasks across deals (due-soon inbox) |
| GET | `/crm/relationships` | relationship graph edges (v2) |

Existing `/deals` endpoints stay; extend `DealOut` with the new fields.

## 7. Frontend

Extend, don't replace `PipelineView`:

- **Deal detail drawer** (`DealDetail.tsx`) — opens from a kanban card:
  overview, contacts, activity timeline, tasks, "Screen this deal" / "Deep dive"
  buttons, linked memo.
- **Contacts view** (`ContactsView.tsx`) — new sidebar tab; searchable table,
  contact detail with enrichment + associated deals.
- **Tasks inbox** — a "Needs attention" strip on the dashboard driven by
  `next_action_at` and open `Interaction` tasks.
- **Relationship graph** (v2) — simple node-link view of who-knows-whom.

New sidebar tabs: `contacts`. Keep `pipeline` as the board. Follow the
`≤300-line, one-responsibility-per-file` refactor rules in `CLAUDE.md`.

## 8. Phasing

- **MVP (v0.2.0):** extend `Deal` fields, add `Contact` + `DealContact` +
  `Interaction`, deal detail drawer, activity log, tasks inbox,
  `POST /deals/{id}/screen`.
- **v2:** auto-enrichment agents, thesis-fit scoring, relationship graph,
  intermediary performance ("which banker's deals actually close").
- **v3:** email capture / calendar sync (the real CRM stickiness), warm-intro
  path-finding.

## 9. Open questions

1. Screening memo — new lightweight model, or a `mode` flag on the existing
   report pipeline? (Leaning: `mode` flag to reuse everything.)
2. Contacts scoped per-workspace shared, or per-user private with opt-in share?
3. Do we need email/calendar integration in v1, or is manual logging enough to
   prove the workflow? (Leaning: manual first.)
4. Thesis-fit scoring needs a "firm thesis" object — where is that configured
   (workspace settings)?
