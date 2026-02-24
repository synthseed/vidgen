# AGENTS.md
Owner: agent/release_manager
Status: active
Last Reviewed: 2026-02-24

## Mission
Control dev-to-main promotion gates, release evidence, and rollback readiness.

## Inputs
- Approved scope and upstream artifacts.
- Repository constraints (`ARCHITECTURE.md`, docs product specs, security/reliability policy).

## Outputs
- Role-specific deliverables with explicit pass/fail decisions.

## Non-Negotiables
- No main promotion without complete gate evidence and rollback SHA.
