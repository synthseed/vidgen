# openclaw workspace blueprint
Owner: platform
Status: active
Last Reviewed: 2026-02-23

This folder contains a recommended OpenClaw multi-agent baseline for this repository.

## Contents
- `openclaw.json`: repo-managed production topology (agents only, no local auth/security/channel values).
- `openclaw.multi-agent.example.json`: full baseline reference for routing/sandbox/tool policy.
- `openclaw.private.template.json5`: local private settings template (do not commit).
- `openclaw.local-root.template.json5`: local root include template for safe layering.
- `docker-compose.example.yml`: VPS Docker service template.
- `.env.example`: environment variable template for compose deployment.
- `vps-docker-setup.md`: concrete VPS deployment checklist.
- `workspace-templates/`: per-agent identity templates:
  - `AGENTS.md`
  - `SOUL.md`
  - `IDENTITY.md`

## Safe Layered Setup
1. Keep repo ownership limited to `openclaw/openclaw.json` (agent topology only).
2. Copy `openclaw.local-root.template.json5` to runtime host config path (example: `/etc/openclaw/openclaw.json5`).
3. Copy `openclaw.private.template.json5` to runtime host private path (example: `/etc/openclaw/openclaw.private.json5`).
4. Put all auth/channels/security/session/env values in `openclaw.private.json5`.
5. Create one OpenClaw workspace per role and copy matching `workspace-templates/<role>/` files.
6. Bind inbound channels/peers to the right agent IDs in local private config.
7. Keep role-critical decisions on role main sessions to preserve identity context.

## VPS Docker Pattern
1. Mount the repo into the container (for example `/app/vidgen`).
2. Keep `/etc/openclaw` on a persistent volume for private config.
3. Set local root include file to:
   - `"/app/vidgen/openclaw/openclaw.json"`
   - `"./openclaw.private.json5"`
4. Set `OPENCLAW_CONFIG_PATH=/etc/openclaw/openclaw.json5`.
5. Validate in container:
   - `openclaw doctor`
   - `openclaw config get agents.list`
   - `openclaw config get channels`
   - `openclaw config get gateway.mode`

## Security Note
- Do not commit local private config files.
- Do not place tokens/secrets inside repository config files.

## Related Docs
- `../docs/design-docs/openclaw-autonomous-agent-fleet.md`
- `../docs/product-specs/autonomous-agent-fleet.md`
- `../docs/SECURITY.md`
