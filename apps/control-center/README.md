# OpenClaw Control Center (Phase 0)
Owner: platform
Status: active
Last Reviewed: 2026-02-25

Internal operations dashboard for OpenClaw runtime visibility.

## Current scope (Phase 0 + Phase 1 foundation)
- Dark dashboard shell
- `/api/overview` endpoint
- `/api/metrics` history endpoint
- Trend chart fed by local ingest snapshots
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
Open http://localhost:3210 (local dev)

When served behind Tailscale path proxy, this app uses base path:
- `https://<tailnet-host>/control-center`

## Smoke check
```bash
OPENCLAW_WORKSPACE=/data/repos/vidgen node apps/control-center/scripts/smoke_overview.js
```

## Ingest a trend snapshot
```bash
cd apps/control-center
OPENCLAW_WORKSPACE=/data/repos/vidgen npm run ingest:snapshot
```

## Notes
- Existing legacy dashboard files are untouched.
- Current implementation remains read-only (no control actions).
- Snapshot history is local file-backed at `apps/control-center/data/ingest/snapshots.jsonl`.
- Planned durable schema is in `apps/control-center/db/schema.sql`.
