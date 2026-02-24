# Main Promotion Records
Owner: platform
Status: active
Last Reviewed: 2026-02-24

## 2026-02-24 Promotion Record
- Promotion type: `dev -> main`
- Promoted SHA: `79123e2b037ef395fc62c0aad5dec0427f1190e5`
- Prior main (rollback SHA): `ed79f7c3dafb27a096af7dc135c4a965043ac8bd`
- Supervised gates: PASS (`bash scripts/supervised_dry_run.sh`)
- Security preflight strict: PASS
- Context drift check: PASS
- Reliability posture: no critical/warn findings in strict preflight path
- Human approval: confirmed in-session before promotion

## Fallback Readiness
- Workflow: `.github/workflows/main-rollback.yml`
- Trigger: manual dispatch with `bad_sha=<failing main commit>`
- Output: rollback branch + rollback PR to `main`

## Related Docs
- `main-promotion-and-fallback.md`
- `supervised-run-checklist.md`
- `openclaw-autonomy-run-protocol.md`
- `autonomy-control-matrix.md`
