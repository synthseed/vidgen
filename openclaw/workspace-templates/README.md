# workspace templates
Owner: platform
Status: active
Last Reviewed: 2026-02-23

Role templates included:
- `main`
- `director`
- `product_manager`
- `engineering_lead`
- `implementation_engineer`
- `qa_guardian`
- `release_manager`
- `trend_researcher`
- `script_writer`
- `continuity_reviewer`
- `render_operator`
- `publisher`
- `reliability_guardian`
- `web_agent`
- `container_expert`
- `webhooks_agent`
- `realtime_data_agent`

Each role folder contains:
- `SOUL.md` (values and operating posture)
- `IDENTITY.md` (agent persona fields)
- `MEMORY.md` (curated semantic/procedural/episodic memory contract)
- `TOOLS.md` (role-local toolchain and workflow defaults; present when needed)

Repo-wide execution guidance is centralized in the root `AGENTS.md`.
Copy these templates into the corresponding OpenClaw agent workspaces and keep them versioned.

Current operating model:
- `main` is global admin/overseer.
- `director` is the video project lead.
- Remaining roles are video specialists plus reliability oversight.
