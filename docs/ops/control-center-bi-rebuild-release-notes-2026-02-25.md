# Control Center BI Rebuild Sprint — Release Notes (2026-02-25)
Owner: platform
Status: active
Last Reviewed: 2026-02-25

## Summary
Control Center now operates as a cohesive BI-style surface across all top-level modules.

## What changed
- Added persistent top-level navigation for: Overview, Cron, Agents, Connections, Optimization, Skills.
- Added integrated BI controls on each page:
  - Time filter (`1h`, `24h`, `7d`, `30d`)
  - Segment filter (`all`, `healthy`, `attention`)
  - Compare mode (`off`, `previous window`)
- Added first-party top-level pages for optimization and skills workflows.
- Added API routes for page-level data parity:
  - `/api/cron`
  - `/api/agents`
  - `/api/connections`
  - `/api/optimization`
  - `/api/skills`
- Upgraded mobile behavior for filters and chip navigation stack.

## QA evidence
- Build: `npm run build`
- Smoke tests: `npm run smoke:metrics && npm run smoke:overview`
- Knowledge base lint: `node scripts/check_knowledge_base.js`
- Security preflight: `node scripts/security_preflight.js`

## Access path
- Main UI: `/control-center`
- New pages:
  - `/control-center/optimization`
  - `/control-center/skills`

## Related Docs
- `../product-specs/openclaw-control-center.md`
- `../exec-plans/active/2026-02-25-openclaw-control-center-phase1.1-plus.md`
- `./control-center-runtime.md`
