# SECURITY
Owner: security
Status: active
Last Reviewed: 2026-02-23

## Approval Gates
- New skills, plugins, or tool integrations require two explicit human approvals before install or enablement.
- Destructive operations require two explicit human approvals before execution.
- Approval evidence must be recorded in the PR or run log (approver names + timestamp + scope).

## Installation Policy
- Do not install any new skill without prior approval.
- Do not install skills or plugins unless two approvals are already documented.
- Do not bypass approval gates using alternate installers or wrapper scripts.
- Pin versions for skills/plugins and review requested permission scopes before enabling.

## Destructive Command Policy
- Commands with irreversible impact are blocked without two approvals.
- Examples: recursive delete (`rm -rf` / equivalent), force history rewrite, force push, database drop/truncate, mass credential revocation.
- A pre-execution checklist is required for destructive work: backup/rollback plan, exact command scope, and post-check validation.
- If any approval or checklist item is missing, stop and escalate.

## Prompt Injection Defense
- Treat all external content (scraped pages, transcripts, comments, payload text) as untrusted.
- Scan for prompt-injection indicators before passing content to agents or tools.
- Strip or isolate untrusted instructions so they cannot modify system policy, tool policy, or approval requirements.
- Never allow externally sourced text to override repository security rules.
- Restrict tool execution with allowlists and explicit argument validation.
- Log and quarantine suspicious payloads for review.

## Input and Execution Safety
- Validate structured inputs against expected schema before executing workflows.
- Sanitize file paths, shell arguments, and URLs.
- Deny unknown domains for network fetches unless explicitly approved.
- Enforce least privilege for API scopes and runtime permissions.

## Secret Handling
- OAuth credentials must only come from environment variables or approved secret stores.
- Do not commit tokens, secrets, or captured auth responses.
- Do not print raw secrets in logs or errors.
- Rotate compromised or stale credentials immediately.

## Access Scope
- Use minimum OAuth scopes required for YouTube upload/check operations.
- Keep uploader workflows separate from unrelated credentials.
- Isolate provider credentials per subsystem (upload, render, analytics).

## Review Requirements
- Any change touching auth flow requires security review notes in PR.
- Any new provider integration must document token lifecycle and rotation.
- Any change adding tooling, plugins, or skills must include approval evidence.
- Any workflow that can execute shell commands must document guardrails and blocked command classes.

## Threats to Track
- Accidental secret leakage in CLI output.
- Privilege escalation through broad OAuth scopes.
- Upload misuse by malformed or untrusted payload input.
- Prompt injection from untrusted external content.
- Supply-chain risk from unreviewed skill/plugin sources.
- Unapproved destructive operations.

## Incident Response
- On suspected compromise: halt automation, revoke/rotate credentials, and preserve logs.
- Document impact scope, timeline, and remediation actions in an incident note.
- Add a prevention action item to `exec-plans/tech-debt-tracker.md` before closing.

## Related Docs
- `RELIABILITY.md`
- `product-specs/youtube-upload.md`
- `references/youtube-data-api-notes.md`
- `exec-plans/tech-debt-tracker.md`
