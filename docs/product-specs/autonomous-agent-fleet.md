# autonomous-agent-fleet spec
Owner: product
Status: draft
Last Reviewed: 2026-02-23

## Objective
Enable autonomous teams of specialized agents to develop and execute the vidgen pipeline
with deterministic handoffs, safety gates, and role-specific identity.

## Role Contracts
1. `director`
   - Input: run intent + constraints.
   - Output: run plan, role assignments, gate decisions.
2. `trend_researcher`
   - Input: topic scope and region constraints.
   - Output: ranked trend dossier with source evidence.
3. `script_writer`
   - Input: approved trend dossier.
   - Output: script package with narration, scenes, text overlays, asset plan.
4. `continuity_reviewer`
   - Input: script package.
   - Output: review report (`pass|needs_fixes`) and mandatory fix list.
5. `render_operator`
   - Input: approved script package.
   - Output: render job receipt, artifact manifest, render logs.
6. `publisher`
   - Input: approved artifacts + metadata.
   - Output: publish receipt, video URL, publishing status.
7. `reliability_guardian`
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
1. Trend gate: no un-attributed claims.
2. Script gate: all scenes have objective + supporting asset plan.
3. Review gate: `continuity_reviewer` must return `pass`.
4. Render gate: artifact integrity checks must pass.
5. Publish gate: policy/security checks must pass.

## Identity and Soul Requirements
- Each role must have dedicated `SOUL.md`, `IDENTITY.md`, and `AGENTS.md`.
- Role-critical decisions must be executed on the role's main session, not generic worker prompts.
- Role identity files must be versioned in-repo and reviewed with behavior changes.

## Non-Functional Requirements
- Idempotent rerun support for all stages.
- Explicit retries with bounded backoff and no duplicate publish.
- Structured event logging for audits and incident replay.
- Policy enforcement through tool/sandbox allowlists.

## MVP Acceptance Criteria
- One end-to-end run from trend intake to private YouTube upload.
- No stage bypass without explicit gate pass.
- Full artifact chain persisted for audit.
- Recovery from one injected transient API failure without duplicate output.

## Related Docs
- `../../ARCHITECTURE.md`
- `../SECURITY.md`
- `../RELIABILITY.md`
- `../design-docs/openclaw-autonomous-agent-fleet.md`
- `trend-to-video-pipeline.md`

