# Changelog

All notable changes to Arthvion are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **MAJOR** — incompatible changes (breaking API/schema/config).
- **MINOR** — new functionality, backward compatible.
- **PATCH** — backward-compatible bug fixes.

The current version lives in [`VERSION`](VERSION) and is mirrored in
`pyproject.toml` and `frontend/package.json`. Every release is also a git tag
(`vMAJOR.MINOR.PATCH`) so you can roll back with `git checkout vX.Y.Z`.

## [Unreleased]

## [0.2.0] - 2026-07-26

AI-native deal CRM: the pipeline gains a relationship + workflow layer that
feeds the agents.

### Added
- Deal CRM (first slice): a deal detail drawer with an activity timeline —
  log notes, calls, emails, meetings, and tasks against a pipeline deal, with
  task due dates and completion toggles. New `Interaction` model + endpoints
  (`/deals/{id}/interactions`, `/interactions/{id}`) and `DealDetail` drawer
  opened from a pipeline card.
- AI deal screening: a fast go/no-go opinion (pursue/hold/pass + thesis-fit
  score, strengths, concerns, next step) generated from the deal record — its
  fields, activity timeline, and any linked diligence report. New
  `ScreeningMemo` model, `/deals/{id}/screen` + `/deals/{id}/screening`
  endpoints, screening service, and `ScreeningPanel` in the deal drawer. Runs
  no agents and costs no memo credit.
- Tasks inbox: a Tasks sidebar tab listing every open task across all deals,
  grouped Overdue / Scheduled / No due date with one-click completion. New
  `GET /crm/tasks` endpoint and `TasksView`.

## [0.1.0] - 2026-07-25

Initial versioned baseline of the multi-agent PE due diligence platform.

### Added
- Four specialist agents (Financial, Risk, Market, Legal) orchestrated in
  parallel, running on Claude Opus, with a synthesis pass into a cited memo.
- Pluggable LLM provider layer (`LLM_PROVIDER`: `bedrock` default,
  `bedrock-mantle`, `anthropic`) via the `make_client()` factory.
- MCP data-source servers: SEC EDGAR, web search, file ingest, pgvector RAG,
  earnings, FRED, CourtListener, OpenSanctions.
- Analyst surfaces: Comps, Screener, Earnings, Deal pipeline, Action queue,
  Watchlist monitoring, Deal Room Q&A, Documents.
- Multi-tenant workspaces with roles/invites, Stripe billing (Solo/Desk/Firm),
  and memo credits.
- Live SSE report progress with event-log replay and polling fallback.
- PDF/print report export.

[Unreleased]: https://github.com/bimal1023/auditforge/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/bimal1023/auditforge/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/bimal1023/auditforge/releases/tag/v0.1.0
