# Agent Handoff — Implementation Guide (v1)

## Mission
Bring the codebase to a clean, maintainable, and scalable state while preserving user-visible behavior unless specified.

## Guiding Principles
- Prefer composition over deep inheritance.
- Strict module boundaries: UI ↔ state ↔ services ↔ API ↔ data.
- Single source of truth for config/env; no inline secrets.
- Tests before or alongside refactors; keep coverage ≥ 80%.

## Global Tasks
1. **Repository Hygiene**
   - Apply `CLEANUP_PLAN.md`: remove or archive `/deprecated` items after sign-off.
   - Enforce formatter and lint in pre-commit hooks.
2. **Frontend**
   - Normalize folder structure: `app/`, `features/`, `shared/`, `widgets/`, `pages/`.
   - Extract duplicated UI into `shared/components`.
   - Implement error boundaries, suspense-ready data fetching, and accessible forms.
   - Split large bundles; verify route-level chunk sizes with a bundle report artifact.
3. **Backend**
   - Introduce clear module boundaries: `api/`, `domain/`, `infra/`, `scripts/`.
   - Centralize validation (e.g., zod/DTOs), consistent error & logging middleware, 12-Factor config.
   - Add request/response typing; enforce strict types at boundaries.
4. **Testing & CI/CD**
   - Pyramid: unit > integration > e2e. Minimum coverage 80%.
   - Speed up CI with caching and split jobs; artifact bundle and coverage reports.
5. **Security & Dependencies**
   - Address vulnerabilities from audit; lockfile refresh; pin critical versions.
   - Add secrets scanning and license policy checks to CI.
6. **Observability**
   - Add structured logs, trace IDs on major flows, minimal metrics (latency, error rate).

## Task Queue (Impact → Effort)
- [ ] T1: **Stand up API proxy + remove client OpenAI keys** — Impact: High, Effort: Medium — Steps: (1) scaffold serverless endpoint, (2) swap frontend fetches to proxy, (3) migrate settings storage — Tests: integration hit proxy with mocked token — Done when: browser never contacts `api.openai.com` directly.
- [ ] T2: **Refactor App shell into routed layout** — Impact: High, Effort: High — Steps: (1) create router + layout, (2) extract feature providers/hooks, (3) shrink `App.jsx` <200 lines — Tests: unit tests for providers + smoke e2e — Done when: build succeeds & navigation works via URLs.
- [ ] T3: **Establish lint/test toolchain** — Impact: Medium, Effort: Medium — Steps: (1) add eslint/prettier configs, (2) configure Vitest + RTL, (3) wire GitHub Actions — Tests: CI pipeline green, coverage ≥80% — Done when: `npm run lint`, `test`, `typecheck` all pass locally and in CI.

## Coding Conventions
- Use Conventional Commits (`feat:`, `fix:`, `chore:` …).
- Absolute imports via Vite aliases after refactor (`@app`, `@features`, etc.).
- Order imports: React libs → third-party → internal modules.
- Prefer function components + hooks; avoid class components.
- Limited inline styles; rely on Tailwind or extracted CSS modules.

## Verification
- Run: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run analyze:bundle`, `npm run audit`.
- Each task lists its own acceptance tests and rollback steps.

## Change Log
Maintain `CHANGELOG.md` with semver and notable refactors.
