# autonomous-agent-fleet spec
Owner: product
Status: draft
Last Reviewed: 2026-02-23

## Objective
Enable autonomous teams of specialized agents to develop and execute the vidgen pipeline
with deterministic handoffs, safety gates, and role-specific identity.

## Role Contracts
1. `main`
   - Input: top-level user requests and policy constraints.
   - Output: delegation decision and admin-level approvals/halts.
2. `director`
   - Input: video run intent + constraints.
   - Output: run plan, role assignments, gate decisions.
3. `product_manager`
   - Input: user goals, backlog pressure, quality/reliability posture.
   - Output: prioritized roadmap items with acceptance criteria.
4. `engineering_lead`
   - Input: approved product requirements and architecture constraints.
   - Output: implementation plan, task slicing, and merge readiness verdict.
5. `implementation_engineer`
   - Input: scoped engineering task package.
   - Output: code changes + tests + docs updates.
6. `qa_guardian`
   - Input: candidate changes and test evidence.
   - Output: verification report (`pass|needs_fixes`) and regression risks.
7. `release_manager`
   - Input: QA pass + branch policy gates.
   - Output: promotion decision (`dev->main`), deploy checklist, rollback target SHA.
8. `trend_researcher`
   - Input: topic scope and region constraints.
   - Output: ranked trend dossier with source evidence.
9. `script_writer`
   - Input: approved trend dossier.
   - Output: script package with narration, scenes, text overlays, asset plan.
10. `continuity_reviewer`
   - Input: script package.
   - Output: review report (`pass|needs_fixes`) and mandatory fix list.
11. `render_operator`
   - Input: approved script package.
   - Output: render job receipt, artifact manifest, render logs.
12. `publisher`
   - Input: approved artifacts + metadata.
   - Output: publish receipt, video URL, publishing status.
13. `reliability_guardian`
   - Input: events/logs from all stages.
   - Output: health signals, halt decisions, incident artifacts.

## Required Artifacts
- `RunEnvelope`: run id, idempotency key, owner agent, timestamps.
- `TrendDossier`: candidates, scoring, citations, constraints.
- `ScriptPackage`: hook, narrative arc, scenes, overlays, asset list.
- `ContinuityReport`: issues, severity, required fixes, reviewer verdict.
- `RenderManifest`: provider job ids, media outputs, checksum list.
- `PublishReceipt`: YouTube id/url, metadata snapshot, visibility state.
- `OpsLog`: timeline of stage transitions and retry attempts.

## Stage Gates
1. Product gate: `product_manager` defines acceptance criteria + scope boundaries.
2. Engineering plan gate: `engineering_lead` confirms architecture fit and test plan.
3. Implementation gate: `implementation_engineer` provides code + tests + docs updates.
4. QA gate: `qa_guardian` must return `pass` before branch promotion.
5. Release gate: `release_manager` validates branch policy and selects rollback SHA.
6. Trend gate: no un-attributed claims.
7. Script gate: all scenes have objective + supporting asset plan.
8. Review gate: `continuity_reviewer` must return `pass`.
9. Render gate: artifact integrity checks must pass.
10. Publish gate: policy/security checks must pass.

## Identity and Soul Requirements
- Each role must have dedicated `SOUL.md`, `IDENTITY.md`, `AGENTS.md`, and `MEMORY.md`.
- Role-critical decisions must be executed on the role's main session, not generic worker prompts.
- Role identity files must be versioned in-repo and reviewed with behavior changes.

## Non-Functional Requirements
- Idempotent rerun support for all stages.
- Explicit retries with bounded backoff and no duplicate publish.
- Structured event logging for audits and incident replay.
- Policy enforcement through tool/sandbox allowlists.

## MVP Acceptance Criteria
- One end-to-end run from trend intake to private YouTube upload.
- One end-to-end engineering run from scoped requirement to `dev` merge candidate.
- No stage bypass without explicit gate pass.
- Full artifact chain persisted for audit.
- Branch promotion requires explicit `dev->main` release gate evidence.
- Recovery from one injected transient API failure without duplicate output.

## Related Docs
- `../../ARCHITECTURE.md`
- `../SECURITY.md`
- `../RELIABILITY.md`
- `../design-docs/openclaw-autonomous-agent-fleet.md`
- `trend-to-video-pipeline.md`
