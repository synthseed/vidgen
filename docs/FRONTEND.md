# FRONTEND
Owner: platform
Status: active
Last Reviewed: 2026-02-23

Frontend now includes `apps/control-center` (Next.js + TypeScript) for internal OpenClaw operations.

## Current UI Surface
- `apps/control-center`: read-only operations dashboard (Phase 0)
  - Dark theme by default
  - `/api/overview` aggregator endpoint
  - KPI + module summary cards for cron, hardened memory, dream-cycle, and agent usage

## UI constraints
- Dark professional visual language with high contrast text.
- Keyboard-accessible controls for future interactive elements.
- Partial degradation behavior: failed data source should not blank entire dashboard.

## Contract links
- Product spec: `product-specs/openclaw-control-center.md`
- Execution plan: `exec-plans/active/2026-02-25-openclaw-control-center-phase0.md`

## Related Docs
- `PRODUCT_SENSE.md`
- `PLANS.md`

