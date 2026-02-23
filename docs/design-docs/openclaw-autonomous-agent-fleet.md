# openclaw-autonomous-agent-fleet
Owner: platform
Status: active
Last Reviewed: 2026-02-23

## Objective
Define a production-grade OpenClaw team model where separate agents have stable soul/identity,
while still collaborating autonomously on development and execution workflows.

## Research-Based Constraints (OpenClaw)
1. Agent identity is workspace-bound:
   - `agentDir` maps to a dedicated workspace under `~/.openclaw/workspaces/agents/{agentId}/{agentDir}`.
   - Each agent has isolated sessions and auth profiles.
2. Main-session prompt context is rich:
   - OpenClaw full prompt mode can include `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`,
     `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, and memory blocks.
3. Sub-agent prompt context is intentionally minimal:
   - Sub-agents receive a compact prompt and by default only pull `AGENTS.md` + `TOOLS.md`.
4. Sub-agent calls are non-blocking:
   - `sessions_spawn` does not block parent execution; command queue controls ordering.
5. Safety requires policy layers:
   - Use sandbox + tool allow/deny rules at global and per-agent levels.
6. Queue behavior matters for autonomy:
   - `messages.queue.mode=collect` avoids dropping or racing events.

## Implication For "Souls + Identity"
If you want strong soul/identity behavior for specialist roles, do not rely solely on generic
sub-agent spawns. Route critical work through dedicated agent IDs/workspaces so each role runs
with its own full prompt context and memory.

## Recommended Agent Team
1. `main`: default admin and request entrypoint; delegates to specialist roles.
2. `director`: planner/router; owns state machine and acceptance gates.
3. `trend_researcher`: API-driven trend intake and source validation.
4. `script_writer`: script package generation (narration, scenes, on-screen text, metadata draft).
5. `continuity_reviewer`: continuity and detail-gap analysis with structured fix list.
6. `render_operator`: render provider adapter execution and artifact manifest.
7. `publisher`: YouTube metadata + upload + publish-state transitions.
8. `reliability_guardian`: observability, retries, incident handling, and policy checks.

## Routing Model
- Primary flow:
  `main -> director -> trend_researcher -> script_writer -> continuity_reviewer -> render_operator -> publisher`.
- Oversight lane:
  `reliability_guardian` receives event stream and can halt/pause runs.
- Sub-agent use:
  allow only shallow depth for burst tasks; keep role-critical actions on dedicated main agents.

## Fit Against Current Repository
## What Already Fits
- Root map-style `AGENTS.md` and structured docs are strong foundations.
- Product specs, quality scoring, and security controls are already explicit.
- Mechanical checks (`check_knowledge_base`, `doc_gardener`, `security_preflight`) reduce drift.

## Current Gaps
- No explicit per-agent workspace templates (`SOUL.md`, `IDENTITY.md`, role `AGENTS.md`).
- No OpenClaw agent routing/config file in-repo.
- No role-level handoff schema contracts for autonomous execution.
- No queue/session/binding policy captured for multi-agent runtime.
- No heartbeat/bootstrap policy for long-running autonomous behavior.

## Required Next Steps
1. Apply local layered config using `openclaw/openclaw.json` + local private include files.
2. Bind channels and auth profiles to role agent IDs on runtime host.
3. Implement run artifacts schema and idempotency keys in orchestrator.
4. Execute active rollout plan in `docs/exec-plans/active/2026-02-23-openclaw-autonomous-rollout.md`.

## Related Docs
- `../../AGENTS.md`
- `../../ARCHITECTURE.md`
- `../PLANS.md`
- `../SECURITY.md`
- `../product-specs/autonomous-agent-fleet.md`
- `../../openclaw/README.md`
