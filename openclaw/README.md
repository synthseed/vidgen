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
4. Keep `main` as the default admin entry point; delegate project execution to project leads.
5. Do not use relative `agentDir` paths; use OpenClaw defaults or absolute writable paths only.

## Team Pattern (Current)
- Global overseer: `main` (admin default, continuity + security + safe remediation).
- Project lead (video generation): `director`.
- Video specialist team: `trend_researcher`, `script_writer`, `continuity_reviewer`, `render_operator`, `publisher`.
- Cross-team safety lane: `reliability_guardian`.

## Do Agents Need Their Own AGENTS.md?
- Not every possible agent must have one.
- Every active role that is expected to make decisions or perform distinct work should have its own `AGENTS.md`.
- In practice for this repo, each active role also keeps `SOUL.md` and `IDENTITY.md` to preserve stable behavior.

## Live Validation Commands
Run in the live OpenClaw container/host:
- `openclaw doctor`
- `openclaw config get agents.list`
- `openclaw config get channels`
- `openclaw config get gateway.mode`

## Runtime Template Sync
If specialist agents appear without workspace identity files in the UI, sync templates into runtime workspaces:
- `node /data/repos/vidgen/scripts/openclaw_sync_agent_templates.js --openclaw-home /data/.openclaw`
- Dry run: `node /data/repos/vidgen/scripts/openclaw_sync_agent_templates.js --openclaw-home /data/.openclaw --dry-run`
The sync script auto-detects both runtime layouts:
- `/data/.openclaw/agents/<agentId>/agent`
- `/data/.openclaw/workspace-<agentId>` (legacy/workspace-style)
It always syncs both paths so UI context remains consistent across mixed layouts.

## Automated VPS Sync
Primary mode is event-driven deploy from GitHub Actions after checks pass on `dev`.
Configure repo secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (optional `VPS_PORT`).

Host-side runner used by both event-driven deploy and manual fallback:
- `bash /docker/openclaw-jnqf/data/repos/vidgen/scripts/vps_autosync_openclaw.sh`
- One-command run + status: `bash /docker/openclaw-jnqf/data/repos/vidgen/scripts/vps_autosync_run_once.sh`
- One-command status snapshot: `bash /docker/openclaw-jnqf/data/repos/vidgen/scripts/vps_autosync_status.sh`

Recommended autosync safety setting:
1. Edit `/etc/default/vidgen-openclaw-autosync`.
2. Set `DIRTY_REPO_STRATEGY=stash` (default) so local drift does not block deploys.
3. Set `VERIFY_REQUIRE_GATEWAY=0` for pairing-required environments (default).

Optional Telegram alerts for deployment failures (recommended):
1. Edit `/etc/default/vidgen-openclaw-autosync`.
2. Set `TELEGRAM_ALERT_ENABLED=1`.
3. Set `TELEGRAM_BOT_TOKEN=<bot token from BotFather>`.
4. Set `TELEGRAM_CHAT_ID=<chat id>`.
5. Optionally set `TELEGRAM_ALERT_MIN_INTERVAL_SEC=<seconds>`.
6. Restart/reload: `systemctl daemon-reload`.

Optional WhatsApp alerts are still supported, but they depend on OpenClaw gateway/device pairing:
1. Set `WHATSAPP_ALERT_ENABLED=1`.
2. Set `WHATSAPP_ALERT_TARGET=<your WhatsApp number or JID>`.
3. Optionally set `WHATSAPP_ALERT_ACCOUNT` if multiple WhatsApp accounts are configured.

The runner:
1. Pulls latest `dev` commit.
2. Runs unified autonomy preflight (`scripts/autonomy_preflight.js`) covering topology, workflow integrity, docs, security, and orchestrator dry-run.
3. Applies repo-owned topology to runtime config without touching private auth/channel/session settings.
4. Syncs per-agent templates (`AGENTS.md`, `SOUL.md`, `IDENTITY.md`) into runtime workspaces.
5. Restarts OpenClaw and verifies health.
6. Restores previous runtime config backup automatically if runtime verification fails.
7. Sends Telegram and/or WhatsApp failure alerts (with cooldown) when enabled.

Deploy workflow post-checks:
1. Event-driven deploy runs autosync script over SSH.
2. Post-deploy strict status validation runs `STRICT_EXIT=1 bash .../vps_autosync_status.sh`.
3. On failure, workflow collects diagnostics and recent systemd logs.

This flow does not call model inference APIs; it uses git/docker/node/system checks only.

## Related Docs
- `../docs/design-docs/openclaw-autonomous-agent-fleet.md`
- `../docs/product-specs/autonomous-agent-fleet.md`
- `../docs/SECURITY.md`
