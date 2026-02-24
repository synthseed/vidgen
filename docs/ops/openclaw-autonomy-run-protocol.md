# OpenClaw Supervised Autonomy Run Protocol
Owner: platform
Status: active
Last Reviewed: 2026-02-24

## Purpose
Run autonomous multi-agent work with human oversight and deterministic gates before any `dev -> main` promotion.

## Scope
Applies to:
- Product/engineering lane (`product_manager` through `release_manager`)
- Video lane (`director` through `publisher`)
- Oversight (`main`, `reliability_guardian`)

## Supervised Run Sequence
1. **Intake + scope lock**
   - Record objective, constraints, and acceptance criteria.
   - Assign lane owner (`product_manager` or `director`).
2. **Plan gate**
   - `engineering_lead` (or `director`) confirms architecture and task decomposition.
3. **Implementation gate**
   - `implementation_engineer` or lane specialist applies changes on `dev`/feature branches only.
4. **Verification gate**
   - Run strict checks via `bash scripts/supervised_dry_run.sh`.
5. **QA gate**
   - `qa_guardian` or `continuity_reviewer` returns `pass|needs_fixes` with evidence.
6. **Release gate**
   - `release_manager` validates branch policy and rollback SHA.
7. **Human approval**
   - Human confirms promotion intent before merge to `main`.

## Required Commands
```bash
bash scripts/supervised_dry_run.sh
node scripts/check_knowledge_base.js
node scripts/doc_gardener.js
```

## Pass Criteria
- No failing checks in dry-run script.
- No security critical/warn findings in preflight path.
- Gate evidence captured in PR body.
- Rollback SHA documented.

## Failure Handling
- `reliability_guardian` halts promotion.
- Open incident note and remediation tasks.
- Re-run dry-run only after fixes are merged to `dev`.

## Related Docs
- `openclaw-branch-promotion.md`
- `openclaw-runtime-hardening.md`
- `../SECURITY.md`
- `../RELIABILITY.md`
