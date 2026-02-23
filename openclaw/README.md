# openclaw workspace blueprint
Owner: platform
Status: active
Last Reviewed: 2026-02-23

This folder contains the repository-owned OpenClaw artifacts used by the live VPS runtime.

## Contents
- `openclaw.json`: repo-managed production topology (includes default admin agent `main`).
- `workspace-templates/`: per-agent identity templates:
  - `AGENTS.md`
  - `SOUL.md`
  - `IDENTITY.md`

## Runtime Ownership Boundary
1. Keep repo ownership limited to `openclaw/openclaw.json` and role identity templates.
2. Keep live VPS private settings (auth, channels, sessions, security, env secrets) outside this repo.
3. Keep role-critical decisions on role main sessions to preserve identity context.
4. Keep `main` as the default admin entry point; delegate execution work to specialist agents.
5. Do not use relative `agentDir` paths; use OpenClaw defaults or absolute writable paths only.

## Live Validation Commands
Run in the live OpenClaw container/host:
- `openclaw doctor`
- `openclaw config get agents.list`
- `openclaw config get channels`
- `openclaw config get gateway.mode`

## Related Docs
- `../docs/design-docs/openclaw-autonomous-agent-fleet.md`
- `../docs/product-specs/autonomous-agent-fleet.md`
- `../docs/SECURITY.md`
