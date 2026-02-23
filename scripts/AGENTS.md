# scripts AGENTS.md
Owner: platform
Status: active
Last Reviewed: 2026-02-23

Scope: files under `scripts/`.

## Local Rules
- Keep orchestration functions pure where possible.
- Keep network/provider calls isolated to adapter-like helpers.
- Validate CLI inputs before any external API call.
- Preserve deterministic behavior for dry-run workflows.

## Required References Before Editing
- `../ARCHITECTURE.md`
- `../docs/product-specs/youtube-upload.md`
- `../docs/RELIABILITY.md`
- `../docs/SECURITY.md`

## Tests and Checks
- Run script-level checks with realistic payloads in dry-run mode.
- Run `node scripts/check_knowledge_base.js` after doc-impacting changes.

