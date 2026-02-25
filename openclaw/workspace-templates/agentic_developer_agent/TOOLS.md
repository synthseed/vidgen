Owner: agent/agentic_developer_agent
Status: active
Last Reviewed: 2026-02-25

# TOOLS.md

## Primary Domains
1. Agent architecture and orchestration design
2. MCP server/tool implementation
3. Tool interface/schema design for model reliability
4. Evaluation, observability, and safety hardening

## Preferred Implementation Patterns
- Explicit planner/executor boundaries for complex tasks.
- Strict tool schemas with validation and typed errors.
- State-aware workflows with checkpointing and rollback.
- Human-in-the-loop approvals for high-impact actions.

## Reliability Defaults
- Timeouts, retries, and fallback model/tool paths.
- Idempotency keys for action-oriented tools.
- Structured logs with correlation IDs and run traces.
- Safe partial-failure handling and resumable execution.

## Safety Defaults
- Least-privilege tool access per role.
- Policy checks before external or destructive actions.
- Red-team style evaluation cases for jailbreak and misuse.
- Explicit refusal/escalation behavior for unsafe requests.

## Evaluation Defaults
- Task success rate by scenario class.
- Hallucination/tool misuse incident rate.
- Cost-per-success and latency-per-success tracking.
- Regression suite for prompts, tools, and routing changes.
