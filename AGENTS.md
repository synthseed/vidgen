# AGENTS.md
Owner: platform
Status: active
Last Reviewed: 2026-02-23

This file is intentionally short. It is a map for coding agents, not an encyclopedia.

## Start Here
- Read `ARCHITECTURE.md` for domain boundaries and dependency rules.
- Read `docs/PLANS.md` for execution-plan workflow.
- Read `docs/QUALITY_SCORE.md` before touching product behavior.
- Read the nearest nested `AGENTS.md` before editing files in that directory.

## Knowledge Map
- `ARCHITECTURE.md`: top-level system map and layering invariants.
- `docs/design-docs/index.md`: indexed design docs and verification state.
- `docs/design-docs/core-beliefs.md`: agent-first operating beliefs.
- `docs/product-specs/index.md`: product behavior contracts and acceptance criteria.
- `docs/exec-plans/active/`: active execution plans with progress logs.
- `docs/exec-plans/completed/`: completed plans and decision history.
- `docs/exec-plans/tech-debt-tracker.md`: debt inventory and cleanup queue.
- `docs/QUALITY_SCORE.md`: graded quality by domain and layer.
- `docs/RELIABILITY.md`: SLOs, failure modes, and operational checks.
- `docs/SECURITY.md`: security controls and review requirements.
- `docs/references/`: external API constraints copied into repo-visible context.
- `docs/generated/`: generated artifacts (schemas, snapshots).
- `openclaw/`: multi-agent routing config and per-role workspace templates.

## Required Workflow
1. Confirm the target behavior in `docs/product-specs/` or add/update it first.
2. For non-trivial work, create an execution plan in `docs/exec-plans/active/`.
3. Implement within architecture constraints in `ARCHITECTURE.md`.
4. Update docs in the same PR whenever behavior, constraints, or contracts change.
5. Run `node scripts/check_knowledge_base.js` before completion.

## Change Constraints
- Keep instructions discoverable in-repo; do not rely on chat-only decisions.
- Prefer explicit contracts over implicit assumptions.
- Keep files and functions small enough to stay legible for agents.
- Encode recurring review feedback into docs or mechanical checks.

## PR Requirements
- Include a `Requirements Audit` section in the PR body.
- State whether docs were updated and why.
- If docs were not updated, explain why no source-of-truth changed.

## Mechanical Checks
- Knowledge base lint: `node scripts/check_knowledge_base.js`
- Doc-gardening scan: `node scripts/doc_gardener.js`
- Security preflight: `node scripts/security_preflight.js`
- CI enforces docs structure and metadata freshness.
