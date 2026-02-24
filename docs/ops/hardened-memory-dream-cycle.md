# Hardened Dream Cycle (Phase 3/4)
Owner: platform
Status: active
Last Reviewed: 2026-02-24

## Purpose
Nightly memory consolidation with safety-first controls and rollbackability.

## Model
Dream Cycle runs use `openai/gpt-5.2`.

## Modes
- Phase 3 (default): `DREAM_READ_ONLY=1` (dry-run only)
- Phase 4: `DREAM_READ_ONLY=0` after 3+ clean dry runs and approval

## Script
- `scripts/memory_hardened_dream_cycle.js`

## Safety Controls
- No destructive git operations.
- Writes only within `memory/hardened/*`.
- Produces metrics + logs every run.
- Retains source unless explicitly in live mode.
- Schema validation remains mandatory post-run.

## Scheduling
- `config/hardened-memory/cron-dream-cycle.json`
- Enabled via `scripts/memory_hardened_phase2_enable.sh` (Phase 3+ wiring)

## Promotion to Live Mode Checklist
1. 3 consecutive dry runs with no validation errors.
2. reliability_guardian signoff.
3. Human approval.
4. Update runbook decision log.
5. Confirm dashboard reminder fired (or manually verify `memory/hardened/dashboard.json`) before switching `DREAM_READ_ONLY=0`.

## Related Docs
- `hardened-memory-module.md`
- `autonomy-control-matrix.md`
- `supervised-run-checklist.md`
