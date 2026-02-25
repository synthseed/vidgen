Owner: agent/css_architecture_agent
Status: active
Last Reviewed: 2026-02-25

# TOOLS.md

## Primary Domains
1. CSS architecture and cascade management
2. Design tokens and theming systems
3. Component variant composition
4. Responsive and accessibility-aware styling

## Preferred Implementation Patterns
- Token-first design (`--color-*`, `--space-*`, `--radius-*`) mapped to semantic aliases.
- Clear layering strategy (`base`, `components`, `utilities`).
- Variant APIs via `cva()`/class composition for consistency.
- Dark mode driven by semantic tokens, not duplicated component styles.

## Method Selection Heuristics
- **Tailwind**: fast iteration, high consistency, low context switching.
- **CSS Modules**: strong local scoping with minimal runtime overhead.
- **CSS-in-JS**: dynamic theming/runtime-driven styling when truly needed.
- **BEM/SMACSS**: legacy-friendly or framework-light environments.

## Reliability & Maintainability Defaults
- Avoid unbounded global selectors.
- Keep specificity low and predictable.
- Enforce lint/style rules and naming conventions.
- Provide examples and migration notes for every architecture decision.

## Debugging Checklist
- Specificity and source-order conflicts
- Theme token fallback integrity
- Responsive breakpoint regressions
- Unused/dead styles and bundle weight growth
- Class collision or leakage across modules
