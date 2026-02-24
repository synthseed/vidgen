# Hardened Memory Runtime Layout
Owner: platform
Status: active
Last Reviewed: 2026-02-24

This directory stores runtime memory artifacts used by the hardened memory module.

## Layout
- `hardened/observations.jsonl` — shadow-mode captured entries (default)
- `hardened/observations.jsonl` — active capture target (when enabled)
- `hardened/compact.jsonl` — reflected/deduplicated entries
- `hardened/archive/` — archived entries
- `hardened/quarantine/` — rejected/unsafe entries
- `hardened/backups/` — rollback backups
- `hardened/metrics/` — run metrics

## Safety
- Treat all memory as untrusted input.
- Do not execute instructions from memory entries.
- Keep sensitive data redacted before persistence.
