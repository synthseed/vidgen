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
- CI checks on `dev/main` push for topology/docs/security/orchestrator dry-run.
- VPS auto-sync runner with health verification and rollback.

## Required Next Controls
- Retry policy for resumable upload failures.
- Structured logs for each upload stage.
- Integration tests using stubbed API responses.
- Explicit channel-to-agent binding verification tests.

## Failure Modes
- Missing/invalid OAuth env vars.
- Bad `publishAt` formats.
- Network interruptions during upload.
- YouTube API quota or policy rejections.

## Related Docs
- `../ARCHITECTURE.md`
- `product-specs/youtube-upload.md`
- `SECURITY.md`
