# RELIABILITY
Owner: platform
Status: active
Last Reviewed: 2026-02-23

## Reliability Objectives
- Upload workflows should be deterministic from payload + env vars.
- External API failures must return actionable errors.
- Retries must be explicit, bounded, and idempotent.

## Current Controls
- Strong CLI argument validation in upload scripts.
- Dry-run mode to verify metadata without publishing.
- OAuth token refresh before API calls.
- Unified autonomy preflight (`scripts/autonomy_preflight.js`) used in CI and VPS candidate validation.
- Memory hygiene checks (`scripts/memory_hygiene_check.js`) to prevent memory drift and bloat across agent templates.
- CI checks on `dev/main` push plus workflow lint.
- Event-driven VPS deploy after CI pass, with auto-sync runner for apply/verify/rollback.
- Post-deploy strict status validation (`STRICT_EXIT=1` on `vps_autosync_status.sh`) and automatic diagnostics on workflow failure.
- Optional hourly fallback timer for disconnected webhook periods.
- Optional Telegram/WhatsApp failure alerts with cooldown in VPS autosync runner.

## Required Next Controls
- Retry policy for resumable upload failures.
- Structured logs for each upload stage.
- Integration tests using stubbed API responses.
- Explicit channel-to-agent binding verification tests.
- Closed-loop learning adapter that turns postmortem findings into tracked backlog updates automatically.

## Failure Modes
- Missing/invalid OAuth env vars.
- Bad `publishAt` formats.
- Network interruptions during upload.
- YouTube API quota or policy rejections.

## Related Docs
- `../ARCHITECTURE.md`
- `product-specs/youtube-upload.md`
- `SECURITY.md`
