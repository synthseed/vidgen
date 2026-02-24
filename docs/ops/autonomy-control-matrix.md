# Autonomy Control Matrix
Owner: platform
Status: active
Last Reviewed: 2026-02-24

## Purpose
Map common autonomous delivery failure classes to detection checks, self-heal actions, escalation triggers, and prevention artifacts.

## Control Matrix
| Failure Class | Detection Check(s) | Auto-Remediation | Escalation Trigger | Prevention Artifact |
| --- | --- | --- | --- | --- |
| Workflow contract drift | `scripts/workflow_integrity_check.js` via `autonomy_preflight` | Fail fast before deploy; `failure_feedback` reruns integrity diagnostics | Repeated failure on same workflow after one patch | `.github/workflows/*`, `scripts/workflow_integrity_check.js` |
| Standards/docs drift | `scripts/check_knowledge_base.js`, `scripts/doc_gardener.js --strict` | Block merge/deploy candidate until docs align | Missing required sections across multiple files | `docs/ops/*`, root doc index updates |
| Memory schema drift | `scripts/memory_hygiene_check.js --strict` | Block candidate, require role template correction | Multiple role templates failing same heading contract | `openclaw/workspace-templates/*/MEMORY.md` |
| Contextual drift (roles/process mismatch) | `scripts/context_drift_check.js` | Block candidate; enforce required headings/templates | Topology roles missing corresponding templates/docs | `openclaw/openclaw.json`, `docs/ops/openclaw-autonomy-run-protocol.md` |
| Security policy regression | `scripts/security_preflight.js --strict` | Block candidate and require explicit fix | Critical findings or dangerous command patterns | `docs/SECURITY.md`, preflight scripts |
| Runtime config perms drift (`openclaw.json` 644) | `openclaw security audit --deep` (cron + manual) | Immediate `chmod 600 /data/.openclaw/openclaw.json` then re-audit | Recurs more than once in 24h or ownership mismatch | `docs/ops/openclaw-runtime-hardening.md`, security alert cron |
| Git host trust failure | Deploy logs (`Host key verification failed`) | `GIT_SSH_COMMAND` with `StrictHostKeyChecking=accept-new` in autosync | Continues after host key acceptance | `scripts/vps_autosync_openclaw.sh` |
| Git auth key mismatch (runtime user) | Deploy logs (`Permission denied (publickey)`) | Deploy step retries + sudo fallback to user with valid git creds | No usable sudo and no valid git key context | Deploy workflow remote step hardening |
| Remote lock/state path permission issue | Deploy logs (lock/state permission denied) | Select writable temp root dynamically; export lock/state/worktree paths | No writable temp directory available | Deploy workflow + autosync runtime path resolver |
| Post-deploy validation mismatch | Status validation step failure | Align status step with same env/sudo fallback as deploy step | Validation fails after successful deploy repeatedly | `.github/workflows/deploy-openclaw-vps.yml` parity checks |
| Branch policy/evidence gaps | `scripts/pr_evidence_check.js` on `dev -> main` PR | Fail PR check until required evidence present | Manual attempts to bypass evidence repeatedly | PR template + evidence workflow + checklist docs |
| Hardened memory schema/redaction drift | `scripts/memory_schema_validate.js` + `scripts/context_drift_check.js` | Block promotion until schema + redaction path are restored | Repeated invalid entries or missing artifacts | `docs/ops/hardened-memory-module.md`, `schemas/memory-entry.schema.json` |
| Dream-cycle consolidation risk | `scripts/memory_hardened_dream_cycle.js` metrics + post-run schema validation | Default to read-only dry run; require signoff before live mode | Any validation failure, false archive signal, or repeated drift alerts | `docs/ops/hardened-memory-dream-cycle.md`, `config/hardened-memory/cron-dream-cycle.json` |

## Operating Rules
1. Every recurring failure must result in either:
   - a script/workflow guard enhancement, or
   - a source-of-truth doc update.
2. Fixes must be verified through `bash scripts/supervised_dry_run.sh` before promotion.
3. Promotion to `main` requires completed supervised evidence fields and rollback SHA.

## Response Sequence (when failure occurs)
1. Capture first failing command and exact error signature.
2. Patch minimal scope for the specific failure class.
3. Re-run strict supervised dry run.
4. Update this matrix (if new class) and relevant runbook/docs.
5. Retry pipeline.

## Related Docs
- `openclaw-autonomy-run-protocol.md`
- `openclaw-branch-promotion.md`
- `supervised-run-checklist.md`
- `openclaw-runtime-hardening.md`
- `../SECURITY.md`
- `../RELIABILITY.md`
