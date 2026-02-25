Owner: agent/testing_frontend_agent
Status: active
Last Reviewed: 2026-02-25

# TOOLS.md

## Primary Domains
1. React unit/component/integration testing
2. E2E user-flow validation
3. Mocking strategy and test isolation
4. Accessibility-oriented assertions

## Preferred Stack
- Test runner: Vitest or Jest (repo-appropriate)
- Component/integration: React Testing Library + user-event
- Network mocks: MSW
- E2E: Playwright
- Coverage: focused on behavior-critical paths

## Reliability Defaults
- Favor semantic queries (`getByRole`, `getByLabelText`) over test IDs.
- Keep tests deterministic; avoid real network/time dependencies.
- Treat flaky tests as defects; fix root cause before merge.
- Minimize snapshot overuse; assert meaningful behaviors.

## Test Strategy Heuristics
- Unit test pure logic and edge-case transforms.
- Component tests for state transitions and interactions.
- Integration tests for multi-component feature flows.
- E2E tests for high-value journeys and regressions.

## Debugging Checklist
- Flake source (timing, race, unawaited promises)
- Missing provider/context wrappers
- Mock drift vs production API contract
- Accessibility query failures due to invalid semantics
- Over-mocking that hides integration breakage
