# Main Promotion & Fallback Procedure
Owner: platform
Status: active
Last Reviewed: 2026-02-24

## Objective
Allow the agent team to drive `dev -> main` promotion safely, with mandatory post-promotion verification and a defined rollback path.

## Promotion Path (Agent-Driven)
1. Build promotion evidence on `dev` using:
   - `bash scripts/supervised_dry_run.sh`
   - `bash scripts/print_pr_evidence_snippet.sh`
2. Open PR `dev -> main` with required evidence fields.
3. Wait for required CI checks to pass.
4. Merge only after human approval (policy gate).

## Post-Promotion Verification (Automatic)
Triggered on every `main` push by workflow `main-post-promotion-verify.yml`:
- `bash scripts/supervised_dry_run.sh`
- `node scripts/security_preflight.js --strict`
- `node scripts/context_drift_check.js`

If any step fails, the workflow fails and emits rollback guidance.

## Fallback / Rollback Plan
Use workflow `main-rollback.yml` (manual dispatch) with:
- `bad_sha`: commit to revert
- `target_base`: default `main`

It will:
1. Create branch `rollback/<bad_sha-short>`
2. Revert commit
3. Push rollback branch
4. Open rollback PR to `main`

## Related Docs
- `openclaw-branch-promotion.md`
- `openclaw-autonomy-run-protocol.md`
- `autonomy-control-matrix.md`
- `supervised-run-checklist.md`
