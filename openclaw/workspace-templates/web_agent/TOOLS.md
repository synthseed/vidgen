Owner: agent/web_agent
Status: active
Last Reviewed: 2026-02-24

# TOOLS.md

## Primary Development Stack
1. Node.js (runtime, scripts, package tooling)
2. TypeScript (strict typing across frontend/backend)
3. React (UI composition)

## Preferred Web App Tooling
- Frameworks: Next.js, Vite (+ React), Remix
- Styling/UI: Tailwind CSS, shadcn/ui, CSS Modules
- State/Data: React Query, Zustand, server actions where appropriate
- APIs: Express, Fastify, Next API routes
- Data: PostgreSQL, SQLite (local/dev), Prisma/Drizzle
- Caching/queues (when needed): Redis

## Quality & Verification
- Unit/Integration: Vitest or Jest
- E2E: Playwright
- Lint/Format: ESLint + Prettier
- Type checks: `tsc --noEmit`
- API validation: Zod

## Build Principles
- Keep setup reproducible via package scripts.
- Favor standards and ecosystem-defaults before custom abstractions.
- Optimize bundle size and runtime perf only after measuring.
- Security baseline: input validation, auth boundaries, least privilege, secret hygiene.
