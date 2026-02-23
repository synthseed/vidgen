# trend-to-video-pipeline spec
Owner: product
Status: draft
Last Reviewed: 2026-02-23

## Objective
Generate and publish YouTube videos from trend signals with continuity review and policy checks.

## Target Stages
1. Trend intake (official API data only).
2. Topic ranking and selection.
3. Script composition with scene-by-scene outputs.
4. Continuity/completeness review with required fixes.
5. Render job submission to provider adapter.
6. Output QA gate.
7. YouTube upload and metadata publishing.
8. Post-publish analytics feedback.

## Required Outputs Per Job
- Topic dossier.
- Script package:
  - narration
  - on-screen text
  - image plan
  - snippet plan
  - metadata draft
- Review report:
  - continuity findings
  - missing details
  - decision (`pass` or `needs_fixes`)
- Render package and artifact manifest.
- Publish receipt and video URL.

## Guardrails
- No direct scraping of YouTube app pages.
- All source claims in scripts must be attributable to known inputs.
- Rendering and publishing stages require prior review pass.

## Acceptance Criteria (MVP)
- Successful run from trend topic to private YouTube upload.
- Deterministic rerun behavior via idempotency key.
- Retryable failures without duplicate publish.
- Full audit record stored in run artifacts.

## Related Code
- `../../scripts/pipeline_contracts.js`
- `../../scripts/pipeline_state_machine.js`
- `../../scripts/pipeline_orchestrator_dry_run.js`

## Related Docs
- `../../ARCHITECTURE.md`
- `../QUALITY_SCORE.md`
- `../exec-plans/tech-debt-tracker.md`
