# youtube-upload spec
Owner: product
Status: active
Last Reviewed: 2026-02-23

## Objective
Upload a local video file to YouTube with validated metadata and predictable defaults.

## Inputs
- CLI arguments or JSON payload:
  - required: `file`
  - optional: `title`, `description`, `tags`, `privacy`, `category`, `publishAt`, `madeForKids`, `dryRun`
- Environment:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `YOUTUBE_REFRESH_TOKEN`

## Behavior Contract
1. Validate arguments and payload shape before any upload call.
2. Obtain OAuth access token via refresh token flow.
3. Initialize resumable upload session.
4. Upload file bytes with appropriate content type.
5. Return parsed YouTube response, including `id` when present.
6. In `dryRun`, do not upload; print validated request payload details.

## Error Contract
- Missing required env vars: fail with explicit error.
- Invalid `privacy` value: fail.
- Invalid `publishAt`: fail.
- Upload initialization or PUT failure: include HTTP status and body when available.

## Compliance
- Use official YouTube Data API endpoints only.
- Support policy-sensitive metadata (`madeForKids`, privacy).

## Related Code
- `../../scripts/youtube_upload.js`
- `../../scripts/youtube_upload_from_payload.js`
- `../../scripts/youtube_check.js`

## Related Docs
- `../RELIABILITY.md`
- `../SECURITY.md`
- `../references/youtube-data-api-notes.md`

