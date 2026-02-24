# OpenClaw Branch Promotion Policy (Multi-Agent)
Owner: platform
Status: active
Last Reviewed: 2026-02-24

## Purpose
Define a hardened, auditable path for autonomous agent teams to deliver development work through the repository branch structure without bypassing review or production safeguards.

## Branch Model
- `dev`: integration branch for autonomous implementation work.
- `main`: protected production branch.

Rules:
1. Agents may create/update feature branches and open PRs into `dev`.
2. Direct pushes to `main` are prohibited.
3. Promotion to `main` is only via PR from `dev` after gates pass.

## Team Lanes
### Product + Engineering lane
- `product_manager`: scope/acceptance criteria.
- `engineering_lead`: architecture-fit plan and task slicing.
- `implementation_engineer`: code + tests + docs.
- `qa_guardian`: verification and regression risk check.
- `release_manager`: release gate owner for `dev->main`.

### Video pipeline lane
- `director`
- `trend_researcher`
- `script_writer`
- `continuity_reviewer`
- `render_operator`
- `publisher`

### Cross-lane safety
- `main`: admin/override/approval point.
- `reliability_guardian`: halt authority for reliability/security violations.

## Required Gate Sequence (`dev->main`)
1. Product gate: acceptance criteria attached to PR.
2. Engineering gate: architecture constraints validated against `ARCHITECTURE.md`.
3. Implementation gate: code + tests + docs landed in `dev`.
4. QA gate: pass verdict + regression summary.
5. Security gate: `node scripts/security_preflight.js` passes.
6. Knowledge gate: `node scripts/check_knowledge_base.js` passes.
7. Policy+evidence gate (single CI gate):
   - head branch must be `dev` for PRs targeting `main`
   - supervised autonomy evidence fields must be present in PR body
8. Release gate: rollback commit SHA documented before merge.

## Required Evidence in PR
- Gate checklist with owner + timestamp.
- Requirements audit summary.
- Verification command outputs (or links to CI artifacts).
- Rollback plan with exact commit/command.

## Deployment Policy
- Sandbox/runtime candidate deploy pulls from `dev` only.
- Production deploy pulls from `main` only.
- Auto-deploy to production must reject non-`main` revisions.

## Rollback
- Revert `main` to last known-good SHA.
- Re-run post-deploy verification (`status`, security audit, reliability checks).
- Record incident + prevention action in `docs/exec-plans/tech-debt-tracker.md`.

## Related Docs
- `../SECURITY.md`
- `../RELIABILITY.md`
- `../PLANS.md`
- `../product-specs/autonomous-agent-fleet.md`
- `../../openclaw/README.md`
