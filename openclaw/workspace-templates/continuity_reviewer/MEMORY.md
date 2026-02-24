# MEMORY
Owner: agent/continuity_reviewer
Status: active
Last Reviewed: 2026-02-24

## Purpose
Maintain review memory for defect patterns, severity calibration, and remediation precision.

## Memory Contract
- Keep memory compact, curated, and decision-useful.
- Prefer durable facts and validated outcomes over raw transcripts.
- Store only information that improves future decisions or execution quality.
- Never store secrets, tokens, credentials, or unnecessary personal data.

## Memory Model
1. Semantic memory: stable facts, constraints, and preferences.
2. Procedural memory: repeatable workflows and known-good defaults.
3. Episodic memory: dated events, decisions, incidents, and outcomes.

## Semantic Memory
### Stable Facts
- Keep role-critical facts that rarely change.
- Each fact should include source evidence (doc path, commit, or artifact).

### Operating Preferences
- Capture stable style/process preferences that improve consistency.

## Procedural Memory
### Reusable Workflows
- Capture proven step sequences that should be reused.

### Known Good Defaults
- Keep safe defaults and fallback paths that repeatedly work.

## Episodic Memory
### Active Decisions
| Date | Decision | Rationale | Evidence | Next Review |
| --- | --- | --- | --- | --- |

### Open Risks And Questions
| Date | Item | Impact | Owner | Next Action |
| --- | --- | --- | --- | --- |

### Recent Learnings
- [YYYY-MM-DD] Learning summary -> operational change.

## Compaction Rules
- Keep only current high-signal entries; merge duplicates.
- Move stale episodic entries into short summaries after resolution.
- Remove resolved items when no longer decision-relevant.
- When facts conflict, keep the latest verified fact and note replacement.

## Update Cadence
- Update after major decisions, incidents, or workflow changes.
- Review at least weekly during active delivery.
- Prune whenever reading this file takes more than ~2 minutes.

## Role-Specific Capture Checklist
- Recurring contradiction or gap patterns by script type.
- Severity calibration examples that improved decision quality.
- Fix templates that resolved high-severity findings quickly.
- Common false alarms to avoid over-blocking.


