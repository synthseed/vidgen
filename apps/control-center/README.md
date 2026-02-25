# OpenClaw Control Center (Phase 0)
Owner: platform
Status: active
Last Reviewed: 2026-02-25

Internal operations dashboard for OpenClaw runtime visibility.

## Phase 0 scope
- Dark dashboard shell
- `/api/overview` endpoint
- Aggregated read-only metrics from:
  - `openclaw cron list`
  - `openclaw status --deep`
  - `memory/hardened/dashboard.json`

## Run locally
```bash
cd apps/control-center
npm install
npm run dev
```
Open http://localhost:3210

## Smoke check
```bash
OPENCLAW_WORKSPACE=/data/repos/vidgen node apps/control-center/scripts/smoke_overview.js
```

## Notes
- Existing legacy dashboard files are untouched.
- This phase is read-only and intentionally avoids mutation actions.
