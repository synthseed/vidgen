# Control Center Runtime Runbook
Owner: platform
Status: active
Last Reviewed: 2026-02-25

## Purpose
Operate the Control Center app on VPS in a stable, repeatable way using systemd and path-based Tailscale serving.

## Service Model
- App service: `vidgen-control-center.service`
- Ingest timer: `vidgen-control-center-ingest.timer`
- Ingest job: `vidgen-control-center-ingest.service` (runs snapshot + retention prune + rollup build)
- Auto-update timer: `vidgen-control-center-autoupdate.timer`
- Auto-update job: `vidgen-control-center-autoupdate.service` (pull/build/restart when `dev` changes)

Install/refresh units:
```bash
bash /docker/openclaw-jnqf/data/repos/vidgen/scripts/install_control_center_systemd.sh
```

If `vidgen-openclaw-autosync.service` is active, new `dev` commits are auto-applied to Control Center as part of autosync (pull -> build -> restart -> health check), so manual rebuild scripts are not needed for normal updates.

## Required Environment
`/etc/default/vidgen-control-center`:
- `NODE_ENV=production`
- `HOST=127.0.0.1`
- `PORT=3210`
- `CONTROL_CENTER_BASE_PATH=/control-center`
- `OPENCLAW_WORKSPACE=/docker/openclaw-jnqf/data/repos/vidgen`
- `CONTROL_CENTER_DIST_DIR=.next` (default; keep this aligned with autosync/autoupdate build scripts)
- `CONTROL_CENTER_RETENTION_DAYS=7`
- `CONTROL_CENTER_API_TOKEN=<optional private token>`
- `CONTROL_CENTER_RATE_LIMIT_CAPACITY=60`
- `CONTROL_CENTER_RATE_LIMIT_REFILL_PER_SEC=1`
- `CONTROL_CENTER_RATE_LIMIT_WINDOW_MS=60000`

## Health Verification
```bash
systemctl status vidgen-control-center --no-pager
systemctl status vidgen-control-center-ingest.timer --no-pager
systemctl status vidgen-control-center-autoupdate.timer --no-pager
curl -f http://127.0.0.1:3210/control-center
curl -f http://127.0.0.1:3210/control-center/api/healthz
curl -f http://127.0.0.1:3210/control-center/api/drilldown/cron
curl -f http://127.0.0.1:3210/control-center/api/weekly-summary
```

## Runtime Hardening Verification
```bash
# service listens only on loopback
ss -ltnp | grep ':3210'

# app and ingest are healthy
systemctl is-active vidgen-control-center.service
systemctl is-active vidgen-control-center-ingest.timer

# auth/rate-limit/fallback integration checks
cd /docker/openclaw-jnqf/data/repos/vidgen/apps/control-center
npm run test:api-integration
npm run check:tailnet-hardening

# visual snapshot checks for key pages
UPDATE_VISUAL_BASELINES=1 npm run check:visual   # first run only
npm run check:visual                              # regression check
```

## Tailscale Route
Keep gateway and control center route updates targeted (no global resets):
```bash
tailscale serve --bg https /control-center http://127.0.0.1:3210/control-center
```
Exact access path:
- `https://<tailnet-host>/control-center`
- drilldowns: `https://<tailnet-host>/control-center/cron`, `/agents`, `/connections`

## Common Failures
### EADDRINUSE on 3210
- Stop stale process or restart service only:
```bash
systemctl restart vidgen-control-center
```

### 404 on `/control-center`
- Ensure basePath and proxy path are aligned (`/control-center` -> `/control-center`).

### 502 from tailnet URL
- Confirm app upstream is live locally before proxy debugging.

## Related Docs
- `../product-specs/openclaw-control-center.md`
- `../../apps/control-center/README.md`
- `../RELIABILITY.md`
