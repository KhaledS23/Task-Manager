# IMPROVEMENT_PLAN.md — Impact × Effort Backlog

Impact scale: High (>critical path), Medium (important), Low (nice-to-have). Effort scale estimates dev-days assuming familiar contributor.

## Architecture

| Task | Impact | Effort | Acceptance Criteria | Test Plan |
| --- | --- | --- | --- | --- |
| Modularize `App.jsx` into shell + feature routes | High | High (5-7d) | `App` only handles routing/layout; AI & sync logic extracted into `app/providers` and `features` folders | Run `npm run build`; regression click-through for tasks/meetings/projects; new unit tests for extracted hooks |
| Introduce router (React Router or TanStack Router) | Medium | Medium (2-3d) | Timeline and Agent pages load via route-based lazy chunks; deep links work | Add route tests with React Testing Library; manual nav test |
| Create global state boundary (Context/Provider) | Medium | Medium (3d) | Shared provider exposes tasks/meetings/projects with typed actions; removes prop drilling | Unit tests for provider reducers; timeline + agent integration tests |

## Frontend

| Task | Impact | Effort | Acceptance Criteria | Test Plan |
| --- | --- | --- | --- | --- |
| Implement placeholder modals (Meeting/Note/Icon, Expanded Tile) or hide until ready | Medium | Medium (2d) | No unused state; either working modals or feature flags gating UI | Component/unit tests for new modals; visual screenshot diff |
| Split heavy bundles (AI agent, charts, rich text) with `React.lazy` | High | Medium (3d) | Bundle report shows each async chunk <250 kB; initial JS <300 kB | Measure via `npm run build && npx source-map-explorer`; smoke test lazy loading |
| Accessibility pass on timeline + agent | Medium | Medium (2d) | Buttons/inputs labelled, keyboard navigation works | Axe automated scan + keyboard QA checklist |

## Backend / Services

| Task | Impact | Effort | Acceptance Criteria | Test Plan |
| --- | --- | --- | --- | --- |
| Stand up API proxy for OpenAI (serverless) | High | Medium (3d) | Frontend calls `/api/ai/*`; secrets stored server-side; rate limiting in place | Integration test hitting mock API; verify no fetches to openai.com in browser devtools |
| Formalize Supabase sync service (background job + delta merge) | Medium | High (5d) | Supabase client isolated in `infra/`; pull/push handles conflicts without reload | Unit tests mocking Supabase; manual offline/online scenario testing |

## Data & Analytics

| Task | Impact | Effort | Acceptance Criteria | Test Plan |
| --- | --- | --- | --- | --- |
| Normalize data schemas (tasks, meetings, projects) with versioning | Medium | Medium (3d) | Shared `schema.ts` or zod validators; migrations handle legacy localStorage blobs | Unit tests for schema parsing/migrations |
| Add analytics hooks (usage metrics, token tracking) | Low | Medium (3d) | Optional analytics service behind consent switch; aggregated metrics persisted safely | Unit tests for opt-in/out + metrics formatting |

## DevEx

| Task | Impact | Effort | Acceptance Criteria | Test Plan |
| --- | --- | --- | --- | --- |
| Add `.gitignore`, lint (`eslint`), format (`prettier`), TypeScript config | High | Medium (2d) | `npm run lint`, `npm run format:check`, `npm run typecheck` succeed locally and in CI | Run new scripts; pre-commit hook simulation |
| Establish testing pyramid (Vitest/Jest + RTL + Playwright smoke) | High | High (6d) | Coverage ≥80%; sample unit/integration/end-to-end suites; coverage report in CI artifact | Execute all test scripts locally & via CI |
| Set up CI/CD (GitHub Actions) | Medium | Medium (2d) | Workflow runs lint/tests/build on PR; caches node_modules | Observe successful pipeline run on sample PR |

## Security

| Task | Impact | Effort | Acceptance Criteria | Test Plan |
| --- | --- | --- | --- | --- |
| Secrets management (remove API keys from localStorage) | High | Medium (3d) | Settings UI stores only tokens necessary for client; sensitive keys handled server-side | Attempt to read from local/sessionStorage; expect no secrets |
| Dependency hygiene (upgrade jspdf/quill/etc; add Renovate) | Medium | Medium (2d upfront) | `npm audit` clean; Renovate bot configured | Run `npm audit`; review Renovate PR dry-run |
| Add security scanning (npm audit CI, secret scanner) | Medium | Low (1d) | CI step fails on new vulnerabilities; secret scanner reports clean | Trigger CI intentionally failing vulnerability to confirm guardrail |

## Sequencing

1. **Hygiene baseline** (DevEx + Security): linting, .gitignore, audit fixes.
2. **Architecture reshape**: modularize App, add routing/provider.
3. **Service hardening**: API proxy + Supabase refactor.
4. **UX improvements**: modals, accessibility, bundle splitting.
5. **Testing & observability**: coverage targets, analytics.
