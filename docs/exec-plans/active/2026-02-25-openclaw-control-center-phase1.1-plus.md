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

## Related Docs
- `../../product-specs/openclaw-control-center.md`
- `../../ops/control-center-runtime.md`
- `../../../apps/control-center/README.md`
