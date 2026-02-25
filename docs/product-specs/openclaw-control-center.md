# openclaw control center
Owner: product
Status: active
Last Reviewed: 2026-02-25

## Purpose
Define behavior contract for an internal web app that provides operational visibility into OpenClaw runtime health, cron execution, hardened-memory (total-recall) status, dream-cycle outcomes, and agent usage trends.

## Users
- Single operator running OpenClaw on VPS/local host.

## MVP Scope
1. Dark-themed dashboard shell with top-level KPI cards.
2. KPI and module data for:
   - Cron health (current + 24h trend summary)
   - Hardened memory (observations, flagged count, recommendation)
   - Dream cycle (run counts, dry/live split, latest run health)
   - Agent usage (active sessions and per-agent usage counts)
3. Unified time range selector (1h, 24h, 7d) for API queries.
4. Partial degradation behavior: unavailable sources do not block all modules.
5. Read-only mode in MVP (no restart/retry control actions).

## Data Sources (MVP)
- `openclaw status --deep`
- `openclaw cron list`
- `memory/hardened/dashboard.json`
- OpenClaw session list (agent usage)

## Acceptance Criteria
1. Dashboard loads with KPI strip in under 2s p95 on cached path.
2. API `/api/overview` returns module-level status with timestamp and source health details.
3. If one source fails, API returns partial data plus explicit source error metadata.
4. Dream-cycle data reflects `memory/hardened/dashboard.json` latest values.
5. Cron section surfaces job counts and failure indicators based on available runtime data.
6. Agent usage section includes per-agent counts over selected time range.

## Non-Goals (MVP)
- Control actions (restart/retry/approve transitions).
- Public internet exposure without private access controls.
- Full anomaly detection and forecasting (deferred to v1.1).

## Related Docs
- `../ops/hardened-memory-module.md`
- `../ops/hardened-memory-dream-cycle.md`
- `../../openclaw/README.md`
