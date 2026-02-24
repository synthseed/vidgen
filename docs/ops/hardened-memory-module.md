# Hardened Memory Module (Total Recall-Compatible)
Owner: platform
Status: active
Last Reviewed: 2026-02-24

## Purpose
Provide persistent agent memory capture and consolidation with strict security controls and compatibility with existing repo governance.

## Mode
Default mode is **shadow** (`memory/hardened/observations.shadow.jsonl`).
No canonical memory replacement occurs until explicitly enabled.

## Components
- `scripts/memory_hardened_observer.js`
- `scripts/memory_hardened_reflector.js`
- `scripts/memory_hardened_recovery.js`
- `scripts/memory_redaction.js`
- `scripts/memory_schema_validate.js`
- `schemas/memory-entry.schema.json`

## Security Controls
- Redaction before persistence (keys/tokens/emails/phones).
- Imperative/prompt-injection pattern stripping.
- Memory entries marked `trusted=false` by default.
- Structured schema validation.
- Memory is data only (never executable instructions).

## Operational Workflow
1. Observer captures recent session content into shadow JSONL.
2. Schema validator verifies entry shape.
3. Reflector deduplicates into `compact.jsonl`.
4. Recovery wrapper can re-run observer after session reset.

## Enablement Notes
- Keep `HARDENED_MEMORY_SHADOW=1` during pilot.
- To switch active output, set `HARDENED_MEMORY_SHADOW=0`.
- Keep drift/security checks green before enabling active mode.

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
- `supervised-run-checklist.md`
- `../../MEMORY.md`
