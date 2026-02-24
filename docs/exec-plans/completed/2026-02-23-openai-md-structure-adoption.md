# 2026-02-23 openai-md-structure-adoption
Owner: platform
Status: completed
Last Reviewed: 2026-02-23

## Context
Repository had minimal docs and no mechanical enforcement for agent context quality.

## Objective
Adopt an OpenAI-style agent-engineering markdown structure:
- short root `AGENTS.md` map
- structured docs knowledge base
- plan discipline
- mechanical checks

## Constraints
- Preserve current upload scripts.
- Keep docs concise and discoverable.
- Avoid introducing runtime dependencies.

## Tasks
- Added root `AGENTS.md` and `ARCHITECTURE.md`.
- Built structured docs tree with design/spec/plan/reliability/security docs.
- Added nested `scripts/AGENTS.md`.
- Added PR template requiring requirements audits.
- Added docs lint and doc-gardening scripts.
- Added CI workflow enforcing knowledge checks.

## Validation
- `node scripts/check_knowledge_base.js`
- `node scripts/doc_gardener.js`

## Risks
- Metadata freshness can decay without regular review.
- Specs may drift as new pipeline modules are implemented.

## Follow-Up Debt
- Add integration tests for upload scripts.
- Add first active plan for trend-to-video orchestrator.
- Add adapter contracts for rendering provider integration.

## Related Docs
- `../../../AGENTS.md`
- `../../PLANS.md`
- `../tech-debt-tracker.md`

