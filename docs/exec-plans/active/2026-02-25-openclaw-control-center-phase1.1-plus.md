# 2026-02-25 openclaw control center phase1.1+
Owner: platform
Status: active
Last Reviewed: 2026-02-25

## Goal
Close the known operational gaps after Phase 1 foundation:
1) managed runtime (no ad-hoc `next start` collisions),
2) robust `/control-center` behavior behind Tailscale path proxy,
3) scheduled ingest + retention/downsampling + richer dashboard metrics,
4) API hardening + deterministic source fallback semantics.

## Current baseline (repo audit)
- App: `apps/control-center` (Next.js app router, basePath hardcoded to `/control-center`).
- Data ingest: manual script appends JSONL (`scripts/ingest_snapshot.js`) with no retention.
- APIs: `/api/overview`, `/api/metrics` are open and uncached by contract (`force-dynamic`).
- Runtime: no dedicated systemd units for control-center service or ingest timer.

---

## Execution Plan

### Track A — Managed app runtime (systemd) to prevent EADDRINUSE/permission failures

#### A1. Add dedicated service user + fixed runtime directories
- Run process as unprivileged user (e.g., `vidgen`) with explicit `WorkingDirectory` and env file.
- Keep bind address at `127.0.0.1` and non-privileged port (`3210`) to avoid sudo/root binds.

#### A2. Create systemd service for control-center
- Use `Restart=always`, conservative backoff, hardened unit options, and explicit environment file.
- Ensure service uses one canonical start path (`npm run start -- -H 127.0.0.1 -p 3210` or direct `next start`).

#### A3. Create install script (same pattern as autosync installer)
- Idempotently install unit/env, reload daemon, enable/start service, print status hints.

#### A4. Pre-start collision check
- Add lightweight guard script to fail fast if another PID already owns 127.0.0.1:3210 and is not this unit.

---

### Track B — Robust basePath operation behind Tailscale `/control-center`

#### B1. Make basePath/env behavior explicit and non-fragile
- Keep default basePath `/control-center`, but permit override via env (`CONTROL_CENTER_BASE_PATH`) for local/testing.
- Add `assetPrefix` derived from basePath for path-proxy safety.
- Add `trailingSlash` policy (off) and document exact proxy expectations.

#### B2. Add health endpoint under app router
- Add `/api/healthz` returning process/env/runtime info (no secrets) so operator can verify both direct and proxied route.

#### B3. Ensure route/url generation respects basePath everywhere
- Audit links/fetches and use relative paths (already mostly true).
- Add smoke checks for:
  - `http://127.0.0.1:3210/control-center`
  - `http://127.0.0.1:3210/control-center/api/overview`

---

### Track C — Scheduled ingest pipeline + retention/downsampling + richer metrics

#### C1. Promote ingest from ad-hoc to scheduled
- Add systemd oneshot service + timer for snapshot ingestion every 5 minutes.
- Add lock file semantics to prevent overlapping runs.

#### C2. Retention and downsampling pipeline
- Keep raw snapshots short-window (e.g., 7 days in JSONL).
- Generate rollups:
  - 1h buckets (24h window)
  - 1d buckets (30d/90d windows)
- Store rollups in `apps/control-center/data/ingest/rollups/*.json` for fast read.

#### C3. Extend metrics API contract
- `/api/metrics?range=24h|7d|30d&resolution=auto|5m|1h|1d`
- Return series metadata and points; include source freshness and sample count.

#### C4. Richer cards/charts
- Add cards: source freshness, ingest lag, error count, trend deltas (vs previous window).
- Add chart toggles for multiple ranges/resolutions and confidence/quality coloring.

---

### Track D — API hardening + source fallback behavior

#### D1. Add read-only API auth gate (private token)
- Optional bearer token (`CONTROL_CENTER_API_TOKEN`) for API routes.
- If set, reject unauthorized API requests with 401 (UI server-render still works locally).

#### D2. Add lightweight rate limiting for API endpoints
- In-memory token bucket per IP + route to reduce accidental abuse.
- Conservative defaults; overridable by env.

#### D3. Normalize source fallback behavior
- Introduce typed source adapter layer with per-source timeout and circuit state.
- API should return partial data with:
  - `sourceHealth[]`
  - `fallbackUsed: true|false`
  - stale flags + `lastSuccessfulAt` if available.

#### D4. Improve command execution safety
- Use explicit absolute command paths when available.
- Add bounded timeouts and classify failures (timeout/not_found/exec_error/parse_error).

---

## Immediate code task breakdown (file-level)

### 1) Runtime/systemd
- **Add** `ops/systemd/vidgen-control-center.service`
- **Add** `ops/systemd/vidgen-control-center.env.example`
- **Add** `ops/systemd/vidgen-control-center-ingest.service`
- **Add** `ops/systemd/vidgen-control-center-ingest.timer`
- **Add** `scripts/install_control_center_systemd.sh`
- **Add** `apps/control-center/scripts/prestart_port_guard.js`
- **Update** `apps/control-center/package.json`
  - `start:prod` script with explicit host/port
  - `ingest:prune` and `ingest:rollup`

### 2) Base path and routing robustness
- **Update** `apps/control-center/next.config.ts`
  - basePath from env fallback `/control-center`
  - aligned `assetPrefix`
- **Add** `apps/control-center/app/api/healthz/route.ts`
- **Update** `apps/control-center/README.md`
  - exact proxy setup matrix + path tests

### 3) Ingest + retention + downsampling
- **Refactor** `apps/control-center/scripts/ingest_snapshot.js`
  - structured result + exit codes + lock handling
- **Add** `apps/control-center/scripts/prune_snapshots.js`
- **Add** `apps/control-center/scripts/build_rollups.js`
- **Add** `apps/control-center/lib/rollups.ts`
- **Update** `apps/control-center/lib/metrics.ts`
  - range/resolution selection + rollup fallback
- **Update** `apps/control-center/app/api/metrics/route.ts`
  - validate params and return enriched payload
- **Update** `apps/control-center/components/metrics-chart.tsx`
  - range switcher + multiple series toggles
- **Update** `apps/control-center/components/kpi-card.tsx`
  - delta and freshness badges
- **Update** `apps/control-center/app/page.tsx`
  - richer KPI row and trend controls

### 4) API hardening + fallback semantics
- **Add** `apps/control-center/lib/api-auth.ts`
- **Add** `apps/control-center/lib/rate-limit.ts`
- **Add** `apps/control-center/lib/source-adapters.ts`
- **Update** `apps/control-center/lib/overview.ts`
  - adapter layer + error taxonomy + fallbackUsed flags
- **Update** `apps/control-center/app/api/overview/route.ts`
- **Update** `apps/control-center/app/api/metrics/route.ts`
- **Add** `apps/control-center/lib/types.ts` (shared API response contracts)

### 5) Tests/smoke/docs
- **Add** `apps/control-center/scripts/smoke_basepath.sh`
- **Add** `apps/control-center/scripts/smoke_metrics.js`
- **Update** `docs/product-specs/openclaw-control-center.md`
  - v1.1 behavior and hardening requirements
- **Add** `docs/ops/control-center-runtime.md`
  - operator runbook: install, status, restart, logs, timer checks

---

## Acceptance checks

### Runtime / process control
1. `bash scripts/install_control_center_systemd.sh`
2. `systemctl is-active vidgen-control-center.service` => `active`
3. Restart loop test: `systemctl restart vidgen-control-center.service` x3, no EADDRINUSE in logs.
4. Verify non-root bind: process owner is service user, listening on 127.0.0.1:3210 only.

### Base path / proxy behavior
1. Local direct: `curl -f http://127.0.0.1:3210/control-center`
2. Local API: `curl -f http://127.0.0.1:3210/control-center/api/overview`
3. Proxied URL responds with HTML and static assets load (no 404 on `/_next/*`).

### Ingest / retention / rollups
1. `systemctl is-active vidgen-control-center-ingest.timer` => `active`
2. Force run: `systemctl start vidgen-control-center-ingest.service`
3. `snapshots.jsonl` receives new row; prune removes stale rows beyond policy.
4. Rollup files generated and `/api/metrics?range=30d` returns downsampled points.

### API hardening / fallback
1. With `CONTROL_CENTER_API_TOKEN` set:
   - no token => 401
   - valid token => 200
2. Rate limit test triggers 429 after threshold.
3. Simulate source failure (missing dashboard file / CLI timeout): `/api/overview` still 200 with partial payload and source error metadata.

### UI
1. Dashboard renders KPI deltas/freshness and selectable trend ranges.
2. Empty/partial data states remain legible and non-breaking.
3. `npm run build` passes in `apps/control-center`.

---

## Delivery sequencing (recommended)
1. **PR-1** Runtime units + installer + prestart guard + docs.
2. **PR-2** BasePath/env/healthz + smoke script.
3. **PR-3** Ingest retention/downsampling + metrics API expansion.
4. **PR-4** API auth/rate-limit/source-adapter fallback + UI metric enrichments.

This sequencing reduces blast radius and allows rollback by layer.

## Progress Log
### 2026-02-25 (overnight slice)
Completed:
- Added source adapter layer with bounded command execution and typed error taxonomy.
- Added API hardening primitives (optional bearer auth, per-route token bucket rate limit).
- Expanded `/api/overview` with fallback flag, freshness, ingest lag KPI, incident timeline, connection diagnostics, and recommendation scaffolding.
- Expanded `/api/metrics` with `range`/`resolution`, rollup fallback metadata, and freshness signal.
- Added ingest lock guard, retention prune script, rollup build script, and wired timer service to maintenance chain.
- Added smoke checks for basePath and metrics endpoint behavior.
- Added `distDir` env override for build/runtime environments with non-writable `.next` ownership.

Validation run:
- `CONTROL_CENTER_DIST_DIR=.next-local npm run build` (pass)
- `npm run ingest:snapshot && npm run ingest:maintenance` (pass)
- `npm run smoke:basepath && npm run smoke:metrics && npm run smoke:overview` (pass)
- `node scripts/check_knowledge_base.js` (pass)
- `node scripts/security_preflight.js` (pass)

Remaining:
- Promote drilldown UX from phase-2 baseline to richer per-job/per-agent tables as data contracts mature.
- Expand scorecards with explicit latency SLIs from structured runtime logs.

### 2026-02-25 (phase3/4/mobile/hardening completion slice)
Completed:
- Implemented Optimization Engine v2 prioritization (`impact * confidence`) and evidence links/signals in `lib/optimization.ts`, surfaced through `/api/overview`.
- Added Agent performance scorecards (reliability, latency proxy, retry pressure, trend deltas) in overview plus dedicated `/api/scorecards`.
- Added Skill Opportunity detector (Phase 4 start) with recurring-pattern candidate cards and payoff estimates (`/api/skill-opportunities`).
- Added Guided workflow skeletons for cron-failure triage + connection recovery with auditable run steps (`/api/workflows`).
- Upgraded mobile responsiveness/touch ergonomics for dashboard navigation/cards and validated narrow layout behavior in CSS.
- Added operational hardening checks: `check:tailnet-hardening` and `check:visual` snapshot regression checks for `/control-center`, `/cron`, `/agents`, `/connections`.
- Updated product spec + runtime docs for new endpoints, hardening controls, and exact tailnet access mapping.

Validation run:
- `CONTROL_CENTER_DIST_DIR=.next-local npm run build` (pass)
- `npm run test:api-integration` (pass)
- `npm run check:tailnet-hardening` (pass via env example + defaults)
- `UPDATE_VISUAL_BASELINES=1 npm run check:visual && npm run check:visual` (pass)
- `node scripts/check_knowledge_base.js` (pass)
- `node scripts/security_preflight.js` (pass)

### 2026-02-25 (overnight continuation)
Completed:
- Added Phase 2 deep-dive pages (`/cron`, `/agents`, `/connections`) plus drilldown API routes for cron/agent/connection diagnostics.
- Added Phase 3 weekly optimization summary generator (`/api/weekly-summary`) with persisted artifact at `apps/control-center/data/ingest/weekly-summary/latest.json`.
- Added integration test harness `scripts/test_api_integration.mjs` covering auth rejection/acceptance, rate-limit 429 behavior, and partial-fallback payload semantics.
- Updated runtime runbook and product spec status notes for hardening verification and new route coverage.

Validation run:
- `npm run test:api-integration` (pass)
- `CONTROL_CENTER_DIST_DIR=.next-local npm run build` (pass)
- `npm run smoke:metrics && npm run smoke:overview` (pass)
- `node scripts/check_knowledge_base.js` (pass)
- `node scripts/security_preflight.js` (pass)

## BI Rebuild Sprint Milestones (rescope)
Guidance sources applied from prior specialist outputs in requester context:
- `control-center-bi-rescope-pm`
- `control-center-bi-design-expert`
- `control-center-bi-tech-plan`

### M1 — Unified in-product navigation
- Replace isolated drilldown/back-link pattern with persistent top-level nav across all sections.
- Add first-party pages for optimization and skills to avoid dashboard ejection.

### M2 — BI-style integrated page composition
- Each page includes KPI strip + evidence chart/module + drilldown table/list.
- Add interactive controls (range/segment/compare) at page top.

### M3 — API parity for BI pages
- Add route-level drilldown APIs for cron/agents/connections/optimization/skills.
- Reuse existing auth + rate-limit controls.

### M4 — Responsive polish + QA
- Ensure controls collapse cleanly at <=980px and <=640px.
- Validate build/tests/knowledge/security preflight before promotion.

## Related Docs
- `../../product-specs/openclaw-control-center.md`
- `../../ops/control-center-runtime.md`
- `../../../apps/control-center/README.md`
