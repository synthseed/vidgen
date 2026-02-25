# openclaw control center
Owner: product
Status: active
Last Reviewed: 2026-02-25

## Purpose
Define behavior contract for a private internal web app that acts as a one-stop operations control center for OpenClaw: cron health, agent performance, connection health, optimization insights, and skill-creation opportunities based on recurring execution patterns.

## Users
- Primary: single operator running OpenClaw on VPS/local host.
- Secondary (future): small trusted operations team under private access controls.

## Product Phases & Milestones
### Phase 1 — Foundation + Reliability Visibility (MVP)
1. Dark-themed dashboard shell with top-level KPI cards.
2. KPI and module data for:
   - Cron health (current + 24h trend summary)
   - Hardened memory (observations, flagged count, recommendation)
   - Dream cycle (run counts, dry/live split, latest run health)
   - Agent usage (active sessions and per-agent usage counts)
3. Unified time range selector (1h, 24h, 7d) for API queries.
4. Trend endpoint for operational history (`/api/metrics`) using ingested snapshots.
5. Partial degradation behavior: unavailable sources do not block all modules.
6. Read-only mode in MVP (no restart/retry control actions).

### Phase 2 — Operations Control & Diagnostics (v1.0)
1. Cron deep-dive views (per-job reliability, missed-run detection, failure categories).
2. Agent performance diagnostics (task volume, latency bands, error rates).
3. Connection health visibility (gateway/channel/session timeline).
4. Incident timeline with normalized error categories and drilldown details.
5. Source freshness badges (`live`, `stale`, `outdated`) at global and module levels.

Current implementation status (2026-02-25):
- Phase 2 drilldown pages are live at `/cron`, `/agents`, `/connections` with matching drilldown APIs.
- Incident timeline scaffold is live in `/api/overview` and dashboard surface.
- Connection diagnostics include pairing-required signal detection.
- Freshness is surfaced globally plus per-source health rows.

### Phase 3 — Performance & Optimization Intelligence (v1.1)
1. Optimization recommendations with evidence links (bottlenecks, retry hotspots, noisy jobs).
2. Agent scorecards (reliability, latency, effectiveness signals).
3. Weekly optimization summary with prioritized actions and expected impact.

Current implementation status (2026-02-25):
- Optimization engine v2 is live in `/api/overview` with impact/confidence-prioritized recommendations and evidence links/signals.
- Agent scorecards are live in `/api/overview` and `/api/scorecards` with reliability, latency proxy, retry pressure, and trend deltas.
- Weekly summary generation is live at `/api/weekly-summary` and persisted to `apps/control-center/data/ingest/weekly-summary/latest.json`.

### Phase 4 — Skill Opportunity Detection (v1.2 target)
1. Detection of recurring manual execution patterns and repeated command sequences.
2. Skill-candidate suggestions with confidence, frequency, and expected payoff.
3. Human-approved workflow to promote suggestions into real skills.

Current implementation status (2026-02-25):
- Recurring pattern detector is live in `/api/overview` and `/api/skill-opportunities`.
- Candidate cards include confidence, frequency, and payoff estimate for review.
- Suggestions remain read-only and require human approval before any skill creation workflow.

### Phase 5 — Guided Operations Workflows (v1.3 target)
1. In-UI runbooks for cron failures, memory anomalies, and connection degradation.
2. Action guardrails (confirmations, policy checks, auditable events).
3. Exportable incident handoff summary.

Current implementation status (2026-02-25):
- Guided workflow skeletons are live in `/api/overview` and `/api/workflows` for cron-failure triage and connection-recovery.
- Each workflow includes auditable run steps/evidence slots.
- Flows are non-mutating scaffolds (execution guardrails remain next increment).

## Data Sources (MVP)
- `openclaw status --deep`
- `openclaw cron list`
- `memory/hardened/dashboard.json`
- OpenClaw session list (agent usage)

## Acceptance Criteria (Phase 1 / MVP)
1. Dashboard loads with KPI strip in under 2s p95 on cached path.
2. API `/api/overview` returns module-level status with timestamp and source health details.
3. If one source fails, API returns partial data plus explicit source error metadata.
4. Dream-cycle data reflects `memory/hardened/dashboard.json` latest values.
5. Cron section surfaces job counts and failure indicators based on available runtime data.
6. Agent usage section includes per-agent counts over selected time range.
7. `/api/metrics` returns ordered history points and dashboard renders trend chart when points exist.

## Milestone Exit Criteria
### Phase 2 (v1.0)
1. Cron, agent, and connection deep-dive pages are available with drilldown paths from top KPIs.
2. Incident timeline captures at least source, severity, timestamp, and normalized error type.
3. Freshness state is visible for all core modules and global header.

### Phase 3 (v1.1)
1. Optimization recommendation panel displays evidence-backed suggestions with clear impact statements.
2. Agent scorecards include reliability + latency signals for selected time windows.
3. Weekly optimization summary can be generated on demand.

### Phase 4 (v1.2 target)
1. Recurring execution detector identifies repeated patterns with confidence scoring.
2. Skill-candidate list includes frequency, expected benefit, and suggested scope.
3. Human review/approval is required before any skill creation action.

### Phase 5 (v1.3 target)
1. Guided runbooks can be executed end-to-end from UI with progress state.
2. Mutating actions are guarded, auditable, and policy-checked.
3. Incident handoff export includes unresolved items and action history.

## BI Experience Contract (2026-02-25 update)
- No top-level section should route operators away from Control Center for core workflows.
- Every top-level page must include all three layers in one cohesive flow:
  1) high-level KPI strip,
  2) visualized trend/module evidence,
  3) low-level drilldown table/list.
- Every top-level page must expose interactive controls for:
  - time window (`1h|24h|7d|30d`),
  - segment filter (`all|healthy|attention`),
  - compare mode (`off|previous window`).
- Required integrated top-level pages: `/`, `/cron`, `/agents`, `/connections`, `/optimization`, `/skills`.

## Mobile Compatibility Baseline (2026-02-25)
- Dashboard and all BI pages support responsive breakpoints at <=980px and <=640px.
- Navigation + key controls use touch-friendly targets (`>=38px`) and stacked layout on narrow widths.
- No horizontal overflow on key cards/tables for `/control-center`, `/cron`, `/agents`, `/connections`, `/optimization`, `/skills`.

## Non-Goals (current roadmap horizon)
- Autonomous destructive remediation without explicit operator approval.
- Public internet exposure without private access controls.
- Multi-tenant organization model and enterprise IAM complexity.
- Predictive ML-heavy anomaly forecasting before core diagnostics are stable.

## Related Docs
- `../ops/hardened-memory-module.md`
- `../ops/hardened-memory-dream-cycle.md`
- `../ops/control-center-runtime.md`
- `../exec-plans/active/2026-02-25-openclaw-control-center-phase1.1-plus.md`
- `../../openclaw/README.md`
