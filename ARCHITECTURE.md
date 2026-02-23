# ARCHITECTURE
Owner: platform
Status: active
Last Reviewed: 2026-02-23

## Purpose
This repository is an agent-legible automation system for generating and publishing videos.
Current implementation scope is YouTube upload tooling. Trend discovery, scripting, rendering,
and review are planned and tracked in `docs/product-specs/` and `docs/exec-plans/`.

## Domains
- Trend Intake: gather candidate topics from approved APIs.
- Script System: produce structured scripts and scene plans.
- Review System: continuity and policy checks before rendering.
- Render System: submit scene instructions to a video generation provider.
- Publish System: upload media and metadata to YouTube.
- Feedback System: evaluate post-publish performance and feed future runs.

## Layering Rules
1. Product Specs (`docs/product-specs/*`) define behavior contracts.
2. Workflow scripts orchestrate adapters; they do not encode product policy.
3. External adapters isolate provider APIs (YouTube, rendering provider).
4. CLI entrypoints validate inputs and call pure workflow functions.
5. Documentation updates are required whenever contracts change.

No lower layer may depend on a higher layer. Scripts must keep provider-specific details
isolated to adapter functions/modules.

## Current Components
- `scripts/youtube_check.js`: OAuth refresh + channel read check.
- `scripts/youtube_upload.js`: validated resumable upload workflow.
- `scripts/youtube_upload_from_payload.js`: payload-based upload wrapper.

## Invariants
- Use official platform APIs only (no YouTube page scraping).
- Keep upload behavior deterministic from explicit input payload + env vars.
- Fail fast on malformed input or invalid policy combinations.
- Keep all operational assumptions captured in repo docs.

## Planned Additions
- API-driven trend intake module.
- Script composition module with review gates.
- Render provider adapter interface for Seedance 2.0 or equivalent backends.
- End-to-end orchestrator with idempotent job state.

