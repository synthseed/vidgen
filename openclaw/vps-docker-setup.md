# vps-docker setup
Owner: platform
Status: active
Last Reviewed: 2026-02-23

## Objective
Run OpenClaw in a VPS Docker environment where repository config stays non-sensitive
and local runtime config remains private/persistent.

## Required Paths
- Repo mount inside container: `/app/vidgen`
- Private config volume path: `/etc/openclaw`
- Local root config: `/etc/openclaw/openclaw.json5`
- Private overlay: `/etc/openclaw/openclaw.private.json5`

## Root Config Content
Use `/etc/openclaw/openclaw.json5`:

```json5
{
  $include: [
    "/app/vidgen/openclaw/openclaw.json",
    "./openclaw.private.json5"
  ]
}
```

## Private Config Content
Start from `openclaw/openclaw.private.template.json5` and populate:
- `gateway`
- `auth`
- `channels`
- `sessions`
- `security`
- `tools`
- `env`

Do not place secrets in repository files.

## Container Environment
Set:
- `OPENCLAW_CONFIG_PATH=/etc/openclaw/openclaw.json5`

## Compose Deployment (Hostinger VPS)
1. Copy templates:
   - `openclaw/docker-compose.example.yml` -> `docker-compose.yml`
   - `openclaw/.env.example` -> `.env`
2. Edit `.env` paths for your host:
   - `VIDGEN_REPO_PATH` (repo checkout on VPS)
   - `OPENCLAW_CONFIG_PATH_HOST` (persistent config directory)
   - `OPENCLAW_STATE_PATH_HOST` (persistent runtime state)
3. Initialize config directory on host:
   - create `${OPENCLAW_CONFIG_PATH_HOST}/openclaw.json5`
   - create `${OPENCLAW_CONFIG_PATH_HOST}/openclaw.private.json5`
4. For `${OPENCLAW_CONFIG_PATH_HOST}/openclaw.json5`, use:

```json5
{
  $include: [
    "/app/vidgen/openclaw/openclaw.json",
    "./openclaw.private.json5"
  ]
}
```

5. Start container:
   - `docker compose up -d`
6. Tail logs:
   - `docker compose logs -f openclaw`

## Validation
Run inside container:
1. `openclaw doctor`
2. `openclaw config get agents.list`
3. `openclaw config get channels`
4. `openclaw config get gateway.mode`

## Related Docs
- `README.md`
- `openclaw.json`
- `docker-compose.example.yml`
- `../docs/SECURITY.md`
