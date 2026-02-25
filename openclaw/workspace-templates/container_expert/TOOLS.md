Owner: agent/container_expert
Status: active
Last Reviewed: 2026-02-25

# TOOLS.md

## Primary Domains
1. Docker / Docker Compose lifecycle and troubleshooting
2. VPS host operations (systemd, networking, permissions, logs)
3. Tailscale Serve/Funnel route management and diagnostics

## Preferred Operational Workflow
1. Read-only triage
   - `docker compose ps`
   - `docker ps -a --format ...`
   - `openclaw status --deep`
   - `tailscale serve status`
   - `ss -ltnp` / `lsof -iTCP -sTCP:LISTEN`
2. Targeted remediation
   - restart one service, not full stack
   - update one route, not global reset
3. Verify
   - local upstream curl checks
   - external path checks
   - status/audit checks
4. Record command trail + rollback notes

## Reliability Defaults
- Prefer `docker compose restart <service>` over broad stack recreation.
- Prefer route-specific `tailscale serve --bg ...` updates over reset operations.
- Use health endpoints and probe commands after every change.
- Maintain stable log locations and non-root service users where possible.

## Incident Debugging Checklist
- Port ownership and conflicts (`EADDRINUSE`)
- Container/service status + recent logs
- Upstream reachability from host
- Proxy path/basePath alignment
- Permission/ownership drift for runtime artifacts
