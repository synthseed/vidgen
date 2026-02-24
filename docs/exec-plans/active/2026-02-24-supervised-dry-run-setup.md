# 2026-02-24 supervised dry run setup
Owner: platform
Status: active
Last Reviewed: 2026-02-24

## Context
The repo now has expanded autonomous agent topology (video lane + product/engineering lane). We need an explicit, repeatable, and auditable supervised dry-run protocol before promoting autonomous changes through `dev -> main`.

## Objective
Create a safe supervised dry-run process with clear gates, executable commands, and CI policy checks that reduce branch/promotion risk.

## Constraints
- No direct `main` write path for autonomous work.
- Reuse existing preflight scripts and documented security/reliability controls.
- Keep runtime secrets/settings out of repo.

## Tasks
1. Add an operational run protocol doc for supervised autonomy runs.
2. Add a repeatable script that executes strict dry-run gates in sequence.
3. Add branch policy CI gate to enforce PR source branch for `main` promotions.
4. Validate docs/knowledge checks.

## Validation
- `bash scripts/supervised_dry_run.sh`
- `node scripts/check_knowledge_base.js`
- `node scripts/doc_gardener.js`

## Risks
- Overly strict branch policy could block legitimate emergency flows.
- Dry-run script may fail if runtime prerequisites are missing.

## Outcomes
- TBD after implementation.

## Related Docs
- `../../ops/openclaw-branch-promotion.md`
- `../../ops/openclaw-runtime-hardening.md`
- `../../RELIABILITY.md`
- `../../SECURITY.md`
