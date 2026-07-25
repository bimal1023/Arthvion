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

[Unreleased]: https://github.com/bimal1023/auditforge/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/bimal1023/auditforge/releases/tag/v0.1.0
