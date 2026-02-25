# OpenClaw Control Center (Phase 0)
Owner: platform
Status: active
Last Reviewed: 2026-02-25

Internal operations dashboard for OpenClaw runtime visibility.

## Current scope (Phase 1.1 + Phase 2/3 + Phase 4/5 prep)
- Dark dashboard shell with KPI freshness and ingest lag card
- `/api/overview` endpoint with partial-fallback semantics, source health, incident timeline, and recommendation scaffolding
- `/api/metrics` history endpoint with `range` + `resolution` query support
- Phase 2 drilldown routes + APIs:
  - UI: `/cron`, `/agents`, `/connections`
  - API: `/api/drilldown/cron`, `/api/drilldown/agents`, `/api/drilldown/connections`
- Additional phase APIs:
  - `/api/scorecards`
  - `/api/skill-opportunities`
  - `/api/workflows`
- Phase 3 weekly optimization summary API + artifact:
  - Optimization engine v2: impact/confidence-prioritized recommendations with evidence links/signals
  - Agent performance scorecards: reliability, latency proxy, retry pressure, trend deltas
  - Phase 4 skill opportunity detector output: recurring pattern cards with frequency + payoff estimate
  - Phase 5 prep workflow skeletons: cron-failure triage + connection-recovery with auditable steps
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

## Tailnet hardening check
```bash
cd apps/control-center
npm run check:tailnet-hardening
```

## Visual snapshot regression checks
```bash
cd apps/control-center
# initial baseline
UPDATE_VISUAL_BASELINES=1 npm run check:visual
# normal validation
npm run check:visual
```
Now covers all top-level BI routes: `/`, `/cron`, `/agents`, `/connections`, `/optimization`, `/skills`.

## BI cohesion contract check
```bash
cd apps/control-center
npm run check:bi-contract
```
Validates every top-level BI route exposes unified nav + controls (`Time`, `Compare`, `Segment`) and a trend module.

## Ingest + retention + rollups
```bash
cd apps/control-center
OPENCLAW_WORKSPACE=/data/repos/vidgen npm run ingest:snapshot
OPENCLAW_WORKSPACE=/data/repos/vidgen npm run ingest:maintenance
```
Maintenance includes retention pruning (`CONTROL_CENTER_RETENTION_DAYS`, default `7`) and rollup generation.

## Managed runtime (recommended on VPS)
Install systemd units from repo templates (includes app service, ingest timer, and auto-update timer):
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
