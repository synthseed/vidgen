# OpenClaw Control Center (Phase 0)
Owner: platform
Status: active
Last Reviewed: 2026-02-25

Internal operations dashboard for OpenClaw runtime visibility.

## Current scope (Phase 1.1 + Phase 2/3)
- Dark dashboard shell with KPI freshness and ingest lag card
- `/api/overview` endpoint with partial-fallback semantics, source health, incident timeline, and recommendation scaffolding
- `/api/metrics` history endpoint with `range` + `resolution` query support
- Phase 2 drilldown routes + APIs:
  - UI: `/cron`, `/agents`, `/connections`
  - API: `/api/drilldown/cron`, `/api/drilldown/agents`, `/api/drilldown/connections`
- Phase 3 weekly optimization summary API + artifact:
  - `/api/weekly-summary` (cached/latest)
  - `/api/weekly-summary?refresh=1` (force regenerate)
  - Artifact: `apps/control-center/data/ingest/weekly-summary/latest.json`
- Trend chart fed by local ingest snapshots and optional rollups (`1h`, `1d`)
- API hardening:
  - Optional bearer auth (`CONTROL_CENTER_API_TOKEN`)
  - In-memory rate limiting (`CONTROL_CENTER_RATE_LIMIT_*`)
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

## Integration test (auth/rate-limit/fallback)
```bash
cd apps/control-center
npm run test:api-integration
```

## Ingest + retention + rollups
```bash
cd apps/control-center
OPENCLAW_WORKSPACE=/data/repos/vidgen npm run ingest:snapshot
OPENCLAW_WORKSPACE=/data/repos/vidgen npm run ingest:maintenance
```
Maintenance includes retention pruning (`CONTROL_CENTER_RETENTION_DAYS`, default `7`) and rollup generation.

## Managed runtime (recommended on VPS)
Install systemd units from repo templates:
```bash
bash /docker/openclaw-jnqf/data/repos/vidgen/scripts/install_control_center_systemd.sh
```

Health checks:
```bash
curl -f http://127.0.0.1:3210/control-center
curl -f http://127.0.0.1:3210/control-center/api/healthz
```

## Notes
- Existing legacy dashboard files are untouched.
- Current implementation remains read-only (no control actions).
- Snapshot history is local file-backed at `apps/control-center/data/ingest/snapshots.jsonl`.
- Planned durable schema is in `apps/control-center/db/schema.sql`.
