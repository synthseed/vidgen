# Control Center — QA Test Plan & Release Checklist (Phase 2 + Phase 3)
Owner: release/qa
Status: active
Last Reviewed: 2026-02-25

## Scope
This plan covers **the next two phases after Phase 1 foundation**:
- **Phase 2:** path-proxy hardening + API correctness + baseline UX/functional completeness.
- **Phase 3:** visual regression hardening (dark theme/assets) + VPS operational smoke + release reliability.

Current baseline validated from repo:
- Next.js app at `apps/control-center`
- Base path configured: `basePath: '/control-center'`
- APIs: `/api/overview`, `/api/metrics`
- File-backed history ingest: `apps/control-center/data/ingest/snapshots.jsonl`
- Existing scripts: `scripts/smoke_overview.js`, `scripts/ingest_snapshot.js`

---

## Exit Gates (must pass to promote)

### Gate A — Functional & API Gate (Phase 2)
**Required evidence:**
1. `npm run build` passes in `apps/control-center`.
2. Functional checklist pass for dashboard modules (cron/memory/dream/agent/source-health).
3. API contract checks pass for `/api/overview` and `/api/metrics`:
   - Valid JSON shape
   - Required fields present
   - Correct status code behavior (200 and expected 500 fallback path)
4. Partial degradation scenario validated (at least one source unavailable, response still usable).
5. Base path route behavior validated under `/control-center` locally and behind proxy.

**Fail conditions:**
- Any P0 bug (blank page, 5xx on default flow, broken base path routing, invalid JSON contract)
- Any missing required key contract for overview or metrics payload

### Gate B — Visual & Operations Gate (Phase 3)
**Required evidence:**
1. Visual regression baseline captured and approved (dark theme critical views).
2. Asset and styling checks pass under base path (CSS/chunks/icons/charts loaded with no 404).
3. VPS smoke suite passes post-deploy:
   - App reachable at `/control-center`
   - APIs return expected payloads
   - ingest script can append a snapshot
4. No new high-severity console/runtime errors in production logs during smoke window.

**Fail conditions:**
- Dark theme unreadability or severe contrast regression
- Proxy path asset breakage (any required bundle/CSS 404)
- VPS smoke failure on app load/API/ingest

---

## Test Matrix

| Area | Phase 2 | Phase 3 | Priority |
|---|---|---|---|
| Core functional dashboard behavior | ✅ | ✅ (recheck) | P0 |
| Path-proxy/basePath behavior | ✅ | ✅ | P0 |
| API correctness/contracts | ✅ | ✅ (sanity) | P0 |
| Partial source degradation | ✅ | ✅ | P0 |
| Dark theme visual regression | ⚠️ baseline prep | ✅ formal | P0/P1 |
| Asset loading (basePath-safe) | ✅ | ✅ | P0 |
| VPS operational smoke | basic | ✅ full | P0 |
| Deploy/rollback readiness | prep | ✅ final | P0 |

---

## Manual Test Scripts

## 1) Functional dashboard script (P0)
**Env:** local dev or production build run

1. Start app:
   - `cd apps/control-center`
   - `npm install`
   - `npm run dev` (or run production build/start)
2. Open `http://localhost:3210/control-center`
3. Verify page renders with:
   - Header, KPI cards, Dream Cycle card, Agent Usage card, Trend card, Source Health section.
4. Verify no fatal UI errors (blank screen, crash overlay).
5. Validate source health entries show states and optional notes.

**Pass:** all modules render; no fatal runtime error.

## 2) API correctness script (P0)

### Overview
```bash
curl -sS "http://localhost:3210/control-center/api/overview?range=24h" | jq .
```
Validate keys:
- `generatedAt`, `range`, `kpis`, `modules`, `sourceHealth`
- `kpis`: `overallHealth`, `cronJobs`, `cronFailing`, `recallFlagged`, `dreamRuns7d`, `activeAgents`

### Metrics
```bash
curl -sS "http://localhost:3210/control-center/api/metrics?limit=20" | jq .
```
Validate keys:
- `generatedAt`, `points[]`
- each point: `ts`, `cronFailing`, `recallFlagged`, `dreamRuns7d`, `activeAgents`

**Pass:** expected schema present; HTTP 200 in normal path.

## 3) Partial degradation script (P0)
1. Temporarily make one data source unavailable (example: move `memory/hardened/dashboard.json` out of path in test env).
2. Hit overview endpoint again.
3. Confirm:
   - API still returns structured payload.
   - `sourceHealth` includes degraded/error entry with source note.
   - UI still renders remaining modules.

**Pass:** degraded mode is survivable and explicit.

## 4) Path-proxy/basePath script (P0)
1. Verify direct path load:
   - `http://localhost:3210/control-center`
2. Verify deep-link/API under base path:
   - `/control-center/api/overview`
   - `/control-center/api/metrics`
3. In browser network tab, confirm static assets load from `/control-center/_next/...` (not root `/_next/...` in proxied context).
4. For tailnet/proxy deployment, verify:
   - `https://<tailnet-host>/control-center` loads.
   - Refresh on page path does not 404.

**Pass:** no path-strip, asset 404, or routing mismatch.

## 5) Visual regression script (dark theme/assets) (P0/P1)
1. Capture baseline screenshots for:
   - Full dashboard (desktop)
   - Mobile breakpoint (<980px)
   - Trend chart populated and empty states
2. Check visual invariants:
   - Dark background gradient present.
   - Text legible on card surfaces.
   - Status badges (ok/warn/err) visible and color-distinct.
   - Card borders/radius/padding preserved.
3. Confirm chart renders with readable axes/lines in dark mode.
4. Confirm no missing fonts/icons/stylesheets.

**Pass:** no severe UI drift or unreadable components.

## 6) VPS operational smoke (P0)
Run after deploy to VPS:

```bash
# if executing on VPS host
cd /docker/openclaw-jnqf/data/repos/vidgen/apps/control-center
npm run build

# API smoke via exposed host/path
curl -fsS "https://<tailnet-host>/control-center/api/overview?range=24h" | jq '.generatedAt,.kpis'
curl -fsS "https://<tailnet-host>/control-center/api/metrics?limit=5" | jq '.points | length'

# ingest smoke
OPENCLAW_WORKSPACE=/docker/openclaw-jnqf/data/repos/vidgen npm run ingest:snapshot
```

Validate:
- Endpoint reachable and JSON valid.
- Ingest appends one new JSONL row.
- UI loads in browser from tailnet path.

**Pass:** app/API/ingest all healthy on VPS runtime context.

---

## Pre-release Checklist (Go/No-Go)
- [ ] `npm run build` clean in `apps/control-center`
- [ ] Functional dashboard script passed
- [ ] API correctness script passed
- [ ] Partial degradation script passed
- [ ] Path-proxy/basePath script passed
- [ ] Visual regression checks approved
- [ ] VPS smoke suite passed
- [ ] Release notes updated (known risks + validation artifacts)
- [ ] Rollback SHA recorded and verified deployable

**Promotion rule:** No promotion without complete gate evidence and rollback SHA.

---

## Rollback Conditions
Trigger immediate rollback if any of the following after release:
1. `/control-center` unavailable or persistent 5xx.
2. `/control-center/api/overview` or `/api/metrics` returns invalid contract or persistent failure.
3. Base path regression causing missing assets/blank UI.
4. Severe visual regression affecting operational readability.
5. VPS smoke checks fail and cannot be remediated quickly.

### Rollback Procedure (high level)
1. Identify last known good commit SHA (pre-recorded rollback SHA).
2. Redeploy previous SHA through standard VPS deploy path.
3. Re-run minimal smoke:
   - page load
   - overview endpoint
   - metrics endpoint
4. Mark current release as failed; attach defect ticket and evidence.

---

## Evidence to collect for sign-off
- Build logs (`npm run build`)
- API sample payloads (`overview`, `metrics`)
- Degradation scenario payload sample
- Screenshot set (desktop + mobile + chart states)
- VPS smoke command output
- Final go/no-go decision record including rollback SHA

---

## Residual Risks
- CLI output drift (`openclaw` command parsing heuristics)
- Unbounded JSONL growth in local snapshot history
- Environment-specific differences when CLI unavailable and docker fallback path is required

Recommended follow-up: add retention/compaction for `snapshots.jsonl` and codify JSON schema tests in CI.

## Related Docs
- `../../apps/control-center/README.md`
- `../product-specs/openclaw-control-center.md`
- `control-center-runtime.md`
