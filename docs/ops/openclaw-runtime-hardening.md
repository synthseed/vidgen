# OpenClaw Runtime Hardening & Continuity Runbook
Owner: platform
Status: active
Last Reviewed: 2026-02-26

## Purpose
Capture the operational configuration needed to keep dashboard access stable while preserving secure defaults for a Docker-hosted OpenClaw runtime on a VPS.

## Baseline Runtime Assumptions
- OpenClaw runs in Docker (`docker compose` service `openclaw`).
- Gateway config file path: `/data/.openclaw/openclaw.json`.
- Device pairing state files:
  - `/data/.openclaw/devices/pending.json`
  - `/data/.openclaw/devices/paired.json`
- Dashboard is accessed over Tailscale URL (`*.ts.net`).

## Required Security Baseline
Set and keep these values:

```json
{
  "gateway": {
    "bind": "tailnet",
    "controlUi": {
      "allowInsecureAuth": false,
      "dangerouslyAllowHostHeaderOriginFallback": false,
      "dangerouslyDisableDeviceAuth": false,
      "allowedOrigins": ["https://<trusted-tailnet-host>.ts.net"]
    },
    "tailscale": {
      "mode": "serve",
      "resetOnExit": false
    },
    "auth": {
      "mode": "token",
      "rateLimit": {
        "maxAttempts": 10,
        "windowMs": 60000,
        "lockoutMs": 300000
      }
    }
  }
}
```

Also enforce:
- `chmod 600 /data/.openclaw/openclaw.json`

## Alerting Jobs (Gateway Scheduler)
Configured periodic checks:
- `healthcheck:gateway-watch` every 10 minutes
- `healthcheck:security-audit` hourly (`0 * * * *`, staggered)

Verification:
```bash
openclaw cron list
```

Remove if needed:
```bash
openclaw cron rm <job-id>
```

## Pairing Failure Recovery (`pairing required` loop)
Symptoms:
- Dashboard repeatedly disconnects.
- Gateway logs show `cause=pairing-required` and `reason=not-paired` for `openclaw-control-ui`.

Recovery sequence:
1. Check pending request in `/data/.openclaw/devices/pending.json`.
2. Promote request to paired entry in `/data/.openclaw/devices/paired.json` with operator scopes:
   - `operator.read`
   - `operator.admin`
   - `operator.approvals`
   - `operator.pairing`
3. Remove matching pending request.
4. Restart container: `docker compose restart openclaw`.
5. Hard refresh dashboard.

Notes:
- Device IDs can remain stable while request IDs rotate.
- Approving stale request IDs will fail silently from operator perspective.

## Continuity Checklist (post-change)
Run after any auth, tailscale, or pairing changes:

```bash
openclaw status --deep
openclaw security audit --deep
openclaw cron list
```

Expected state:
- Gateway reachable
- Channels healthy
- Security audit: no critical findings
- Scheduled health jobs present and enabled

## Rollback
1. Restore last known good config backup:
   - `/data/.openclaw/openclaw.json.bak.*`
2. `chmod 600 /data/.openclaw/openclaw.json`
3. `docker compose restart openclaw`
4. Re-run continuity checklist

## Secret Hygiene Reminder
- Do not paste full `docker compose config` output into shared channels.
- Treat exposed keys/tokens as compromised and rotate.
- Keep environment and credentials isolated between prod and sandbox runtime instances.

## Related Docs
- `../SECURITY.md`
- `../RELIABILITY.md`
- `../PLANS.md`
- `../../AGENTS.md`
