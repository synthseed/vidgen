# 2026-02-25 openclaw control center phase1
Owner: platform
Status: active
Last Reviewed: 2026-02-25

## Context
Phase 0 delivered a read-only dashboard shell and overview API. Next phase adds history ingestion and trend visualization scaffolding.

## Objective
Implement Phase 1 foundations: ingest snapshots on a schedule, expose trend API, and render operational trend chart in UI.

## Constraints
- Keep existing dashboard-related legacy files untouched.
- Continue read-only behavior; no mutating control actions.
- Preserve graceful behavior when data files are missing.

## Tasks
1. Add ingest snapshot script and local ingest data path.
2. Add metrics history API endpoint.
3. Add trend chart component on dashboard.
4. Add Timescale-ready schema for planned durable storage.
5. Update docs/run instructions.

## Validation
- `npm run ingest:snapshot` (apps/control-center)
- `npm run build` (apps/control-center)
- `node scripts/check_knowledge_base.js`

## Risks
- CLI output parsing drift.
- Missing runtime command access in some environments.
- Growth of file-based snapshots without retention policy.

## Outcomes
- Added ingest snapshot script and local ingest path (`apps/control-center/data/ingest/snapshots.jsonl`).
- Added `/api/metrics` endpoint and dashboard trend chart component.
- Added Timescale-ready schema scaffold (`apps/control-center/db/schema.sql`).
- Updated product/frontend/app docs for Phase 1 foundation.
- Validation completed: `npm run ingest:snapshot`, `npm run build`, and `node scripts/check_knowledge_base.js` pass.

## Related Docs
- `../../product-specs/openclaw-control-center.md`
- `../../FRONTEND.md`
- `../../../apps/control-center/README.md`
