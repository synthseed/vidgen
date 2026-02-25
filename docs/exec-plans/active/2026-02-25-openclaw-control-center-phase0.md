# 2026-02-25 openclaw control center phase0
Owner: platform
Status: active
Last Reviewed: 2026-02-25

## Context
User requested immediate execution of a new internal control-center web app for OpenClaw operations with a dark, polished UI and key metrics for cron health, hardened memory, dream cycle, and agent usage.

## Objective
Deliver Phase 0 scaffold: a runnable Next.js + TypeScript app with dark dashboard shell and `/api/overview` endpoint backed by current repo/runtime data sources.

## Constraints
- Keep existing dashboard-related files untouched.
- Read-only MVP behavior; no mutating control actions.
- Preserve partial-data behavior under source failures.
- Keep contracts discoverable in repo docs.

## Tasks
1. Add product spec for OpenClaw control-center behavior.
2. Scaffold `apps/control-center` Next.js TypeScript app with dark dashboard shell.
3. Implement `/api/overview` aggregator for cron/memory/dream/agent usage.
4. Add lightweight docs for local run and architecture notes.
5. Run knowledge-base check and capture outcomes.

## Validation
- `node scripts/check_knowledge_base.js`
- `node apps/control-center/scripts/smoke_overview.js`

## Risks
- Runtime command availability differences across host/container.
- OpenClaw CLI output drift and parse fragility.
- Missing npm dependencies in current environment.

## Outcomes
- Added product spec `docs/product-specs/openclaw-control-center.md` and indexed it.
- Scaffolded `apps/control-center` with Next.js + TypeScript dark dashboard shell.
- Implemented read-only `/api/overview` endpoint with partial-source degradation handling.
- Added Phase 0 run instructions and smoke script.
- Validation completed: `apps/control-center/scripts/smoke_overview.js`, `npm run build` (in `apps/control-center`), and `scripts/check_knowledge_base.js` all pass.

## Related Docs
- `../../product-specs/openclaw-control-center.md`
- `../../FRONTEND.md`
- `../../../openclaw/README.md`
