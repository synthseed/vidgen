# Release Manager Promotion Prompt (Non-Redundant)
Owner: platform
Status: active
Last Reviewed: 2026-02-24

## Purpose
Provide a **delta-only** prompt for `release_manager` to run final `dev -> main` promotion checks **without duplicating** existing checklists.

## Non-Redundancy Rule
Do not restate or rerun checks already covered by:
- `docs/ops/supervised-run-checklist.md`
- `docs/ops/openclaw-autonomy-run-protocol.md`
- `docs/ops/autonomy-control-matrix.md`

This prompt only validates final promotion deltas.

## Prompt Template
```text
You are release_manager. Run final promotion readiness for dev -> main.

Constraints:
- Treat prior supervised run outputs as source-of-truth.
- Do NOT duplicate full checklist execution unless evidence is stale or missing.
- Focus only on promotion deltas and blockers.

Required output:
1) Candidate SHA and rollback SHA confirmation.
2) Confirmation that required PR evidence fields are complete.
3) Any new failures since the last supervised run.
4) Promotion verdict: APPROVE or HOLD.
5) If HOLD: minimal remediation steps and exact owner.

Blocking criteria:
- Missing rollback SHA
- Missing human approval record
- Missing reliability guardian signoff
- Any failing required CI check on dev -> main PR

If all blocking criteria pass and no new failures are found, return APPROVE.
```

## When to Re-run Full Checks
Only trigger full re-run if one of these is true:
- Candidate SHA changed after last supervised run
- Required CI checks are red/unknown
- Drift/security alerts appeared after last run

## Related Docs
- `supervised-run-checklist.md`
- `openclaw-autonomy-run-protocol.md`
- `autonomy-control-matrix.md`
- `main-promotion-and-fallback.md`
