# 2026-02-24 hardened total recall install
Owner: platform
Status: active
Last Reviewed: 2026-02-24

## Context
User requested installation of a Total Recall-style memory module with hardening and compatibility with existing branch gates, CI checks, and multi-agent memory contracts.

## Objective
Install a hardened, schema-based persistent memory module in active mode, integrate with repo controls, and update agent memory docs for practical usage without introducing security regressions.

## Constraints
- No unsafe env loading (`eval`/`source`) in new module scripts.
- Memory treated as untrusted data.
- Must align with current docs/checklists/control matrix.
- Must pass strict knowledge/doc/preflight checks.

## Tasks
1. Add hardened module docs + schema + scripts (observer, reflector, recovery, redaction, validation).
2. Add memory runtime folder structure and README guidance.
3. Update agent MEMORY templates and root MEMORY.md with integration section.
4. Extend drift checks to include module artifacts.
5. Run validation suite and commit.

## Validation
- `bash scripts/supervised_dry_run.sh`
- `node scripts/check_knowledge_base.js`
- `node scripts/doc_gardener.js --strict`

## Risks
- Overfitting drift checks could block unrelated changes.
- Shadow-mode scripts may require path/env tuning for some hosts.

## Outcomes
- TBD

## Related Docs
- `../../ops/hardened-memory-module.md`
- `../../ops/autonomy-control-matrix.md`
- `../../ops/openclaw-autonomy-run-protocol.md`
