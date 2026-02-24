# Hardened Memory Module (Total Recall-Compatible)
Owner: platform
Status: active
Last Reviewed: 2026-02-24

## Purpose
Provide persistent agent memory capture and consolidation with strict security controls and compatibility with existing repo governance.

## Mode
Default mode is **active hardened JSONL** (`memory/hardened/observations.jsonl`).
Shadow mode can still be enabled explicitly with `HARDENED_MEMORY_SHADOW=1` for testing.

## Components
- `scripts/memory_hardened_observer.js`
- `scripts/memory_hardened_reflector.js`
- `scripts/memory_hardened_recovery.js`
- `scripts/memory_hardened_watcher.sh` (optional reactive watcher)
- `scripts/memory_hardened_phase2_enable.sh` (cron wiring helper)
- `scripts/memory_redaction.js`
- `scripts/memory_schema_validate.js`
- `schemas/memory-entry.schema.json`
- `config/hardened-memory/*` (cron + memoryFlush snippets)

## Security Controls
- Redaction before persistence (keys/tokens/emails/phones).
- Imperative/prompt-injection pattern stripping.
- Memory entries marked `trusted=false` by default.
- Structured schema validation.
- Memory is data only (never executable instructions).

## Operational Workflow
1. Observer captures recent session content into hardened JSONL.
2. Schema validator verifies entry shape.
3. Reflector deduplicates into `compact.jsonl`.
4. Recovery wrapper can re-run observer after session reset.

## Enablement Notes
- Keep `HARDENED_MEMORY_SHADOW=0` during pilot.
- To switch active output, set `HARDENED_MEMORY_SHADOW=0`.
- Keep drift/security checks green before enabling active mode.

## Phase 2 Parity (Implemented)
Phase 2 adds operational parity controls while preserving hardening:
1. Cron observer cadence (every 15m)
2. Cron reflector cadence (hourly)
3. Optional reactive watcher loop (`memory_hardened_watcher.sh`)
4. memoryFlush integration snippet (`config/hardened-memory/memory-flush-snippet.json`)

### Apply Phase 2 Wiring
```bash
bash scripts/memory_hardened_phase2_enable.sh
```

### Compaction Hook Compatibility Note
Current OpenClaw runtime config rejects a top-level `compaction` key, so direct `memoryFlush` config injection is not used in this deployment.
Safe fallback is enforced with layered scheduling:
- observer (15m)
- reflector (hourly)
- recovery (20m)
- optional watcher loop

## Validation
```bash
node scripts/memory_hardened_observer.js
node scripts/memory_schema_validate.js
node scripts/memory_hardened_reflector.js
bash scripts/supervised_dry_run.sh
```

## Related Docs
- `openclaw-autonomy-run-protocol.md`
- `autonomy-control-matrix.md`
- `hardened-memory-dream-cycle.md`
- `supervised-run-checklist.md`
- `../../MEMORY.md`
