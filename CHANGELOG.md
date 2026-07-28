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

## [0.3.0] - 2026-07-27

Demo mode — presentation tooling for launch videos and live walkthroughs.

### Added
- `/app?demo=1` runs a scripted ~18-second pipeline against a hand-authored
  Apple FY2024 sample instead of dispatching a real report. Built for filming:
  a real run takes 2–4 minutes and finishes in a clump, which reads on camera
  as nothing happening followed by everything happening. The scripted timeline
  resolves the four agents one at a time so each completion is visible, and
  eases the progress bars across their own windows (the production tick only
  creeps ~1%/s, which looks stalled when compressed).
- Query params: `&speed=` (0.25–4× timeline multiplier, for matching a take to
  a voiceover) and `&badge=0` (hides the "Demo data" marker for clean capture).
- `demo/demoReport.ts` — the sample memo: Apple FY2024 financials, six risks,
  market position, and three legal matters, with citations. Figures are
  transcribed from the 10-K for presentation and should be verified against the
  source filing before being published in anything.

### Notes
- Demo mode is strictly client-side. It sends no request, creates no report
  row, and spends no memo credit — verified against the API log and the
  credit ledger. It does **not** bypass authentication; you still sign in.
- The "Demo data" badge is shown by default on purpose, so sample figures are
  never mistaken for a real agent run. `&badge=0` is an explicit opt-out.
- The form is prefilled with Apple Inc./AAPL because the scripted run always
  lands the Apple sample regardless of what is typed.
- Plan gating is unchanged — comp your workspace to `firm` via the admin plan
  endpoint if you need to film Comps, Screener, or Earnings.

## [0.2.1] - 2026-07-27

### Fixed
- Landing page no longer scrolls horizontally on phones. The hero's report
  mock gained Ask and Discussion tabs in 0.2.0, and that six-tab row set a
  505px min-content floor; because grid tracks size to min-content, it dragged
  the whole hero grid to 523px inside a 390px viewport, leaving every section
  squeezed against a dead band on the right. The tab rows now scroll in place
  and grid children carry `min-width: 0` so a wide child can never widen the
  page again.
- Mobile nav menu no longer clips its last item — the panel's `max-height`
  (460px) was shorter than its own content (514px), cutting off "Get started".
- The memo mock's 5-column segment table and the `/docs` reference tables
  scroll within their cards instead of overflowing at ≤400px.
- `.output`, `.proof`, `.cta-strip` and `.footer` now use mobile section
  padding. Their rules are declared after the mobile block at equal
  specificity, so the earlier media query never applied to them.

### Changed
- Mobile landing polish: hero stats sit in an even 2×2 grid, hero and CTA
  buttons go full-width, the report mock keeps its gauge inline on a row
  (with a smaller dial), and card hover-lift is disabled on touch.

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

[Unreleased]: https://github.com/bimal1023/auditforge/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/bimal1023/auditforge/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/bimal1023/auditforge/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/bimal1023/auditforge/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/bimal1023/auditforge/releases/tag/v0.1.0
