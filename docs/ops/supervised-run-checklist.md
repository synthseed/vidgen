# Supervised Autonomy Run Checklist
Owner: platform
Status: active
Last Reviewed: 2026-02-24

## Run Metadata
- Run ID:
- Date/Time (UTC):
- Request Owner:
- Lane: product/engineering | video | both
- Repo Branch:
- Candidate SHA:

## Required Global Gates
- [ ] Scope and objective documented
- [ ] Acceptance criteria are testable pass/fail checks
- [ ] No unauthorized direct write to `main`
- [ ] `bash scripts/supervised_dry_run.sh` PASS
- [ ] `node scripts/check_knowledge_base.js` PASS
- [ ] `node scripts/doc_gardener.js` PASS

## Product/Engineering Lane Gates
### product_manager
- [ ] Objective and scope boundaries are explicit
- [ ] Acceptance criteria finalized
- [ ] Risks + mitigations documented
- Artifact link(s):

### engineering_lead
- [ ] Architecture-fit review complete
- [ ] Task decomposition complete
- [ ] Verification strategy defined
- Artifact link(s):

### implementation_engineer
- [ ] Changes scoped to approved objective
- [ ] Tests added/updated
- [ ] Source-of-truth docs updated where behavior changed
- Artifact link(s):

### qa_guardian
- [ ] Verification result: pass | needs_fixes
- [ ] Regression risks documented
- Artifact link(s):

### release_manager
- [ ] `dev -> main` policy satisfied
- [ ] Rollback SHA recorded
- [ ] Promotion decision recorded
- Artifact link(s):

## Video Lane Gates
### trend_researcher
- [ ] Trend claims attributable (citations)
- [ ] Candidate list non-empty
- [ ] Topic ranking rationale present
- Artifact link(s): TrendDossier / TopicRanking

### script_writer
- [ ] Hook present
- [ ] Scene list valid (`id` + objective)
- [ ] Asset plan coverage complete
- Artifact link(s): ScriptPackage

### continuity_reviewer
- [ ] Verdict recorded (`pass|needs_fixes`)
- [ ] No unresolved required/high-severity findings for pass
- Artifact link(s): ContinuityReport

### render_operator
- [ ] Continuity pass confirmed prior to render
- [ ] Manifest includes job IDs + output checksums
- [ ] QA-stage manifest complete
- Artifact link(s): RenderManifest / QA manifest

### publisher
- [ ] `securityPassed` true
- [ ] `policyPassed` true
- [ ] `reviewPassed` true
- [ ] `qaPassed` true
- Artifact link(s): PublishReceipt / gate evidence

## Oversight + Safety
- [ ] reliability_guardian reviewed run health and policy posture
- [ ] main approved final promotion decision
- [ ] Incident/deviation log attached (if any)

## Signoff
- Product/Scope Owner:
- Engineering Lead:
- QA Guardian:
- Release Manager:
- Reliability Guardian:
- Human Approval:

## Related Docs
- `openclaw-autonomy-run-protocol.md`
- `openclaw-branch-promotion.md`
- `openclaw-runtime-hardening.md`
- `../SECURITY.md`
- `../RELIABILITY.md`
