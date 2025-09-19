# Product & Engineering Improvements (Agent GPT‑5 High)

This document captures concrete improvements and a phased plan to implement the highest‑impact items. It balances low‑risk quick wins with structural upgrades while preserving current behavior.

## Summary of Ideas

Small fixes and ergonomics
- Error boundary with friendly fallback around the app root.
- ESLint + Prettier + Husky pre‑commit hooks; CI coverage gate.
- Absolute imports via Vite aliases (`@app`, `@features`, `@shared`, `@pages`).
- Keyboard shortcuts (n/new task, / search, esc close modals).
- Image/asset hygiene; Tailwind JIT classes only used in code.

UX & Accessibility
- Modal a11y: focus trap, `role="dialog"`, `aria-modal`, initial focus, ESC to close.
- Quick‑add parser for tasks (e.g., "Email partner @alex #sales p:high d:2025-01-05").
- Saved filters (“smart lists”) for owners/tags/priority.
- Virtualization for long lists to keep UI responsive.

Architecture & Platform
- Routed layout with lazy‑loaded pages and deep links.
- API proxy layer to remove client OpenAI keys and centralize API access.
- Centralized validation (zod/DTOs) at boundaries; optional gradual TypeScript.
- Versioned localStorage schema + migrations.
- Minimal observability: structured logs, trace IDs for task edits and sync.

Testing & CI
- Unit tests for task edit/open flows; integration test for meeting linking.
- Coverage ≥80% in CI with caching and bundle/coverage artifacts.
- Secret scanning and dependency audit in CI.

Security & Dependencies
- No inline secrets; 12‑Factor config via env and a single config module.
- Lockfile refresh; pin critical packages; license checks.

Product Extensions
- ICS export/subscription for due tasks.
- Meeting templates; convert bullets to tasks.
- Tag insights & charts with drill‑down.
- PWA install + offline support.

---

## “Apply” Items — Phased Implementation Plan

We’ll implement the five requested changes in phases to reduce risk and keep the app shippable between steps. Each phase lists scope, acceptance criteria, and notes.

### Phase 1 — Router + Routed Layout (T2) and Route‑Level Code Splitting
- Scope:
  - Introduce React Router.
  - Split current `App.jsx` monolith into routed pages (`/timeline`, `/agent`, `/deepl`, `/settings`).
  - Lazy‑load pages with `React.lazy` + `Suspense`.
  - Keep existing state hooks (`useTasks`, `useMeetings`, `useProjects`) and pass via a top‑level provider or context so user‑visible behavior remains unchanged.
- Acceptance:
  - Build succeeds; navigation works via URLs; initial load keeps current default (timeline).
  - Bundle analyzer shows separate chunks per route.
  - No regression in task open/edit flows.
- Notes:
  - Adds groundwork for deep links and allows progressive code splitting.

### Phase 2 — Deep Linking to Tasks
- Scope:
  - Support `?task=task-123` and `/task/:id` to open `TaskModal` on mount.
  - When opening a task from UI, push a URL reflecting the task; closing modal restores the previous route.
  - Graceful fallback if task not found (no crash, small toast).
- Acceptance:
  - Visiting `/timeline?task=<id>` opens the modal; refreshing keeps the modal open.
  - Copy‑pasting `/task/<id>` deep link opens the correct task across sessions.
  - Tests cover open/close and not‑found behavior.
- Notes:
  - Integrates with Phase 1 router; uses existing `findTaskContext` to resolve tile/task context.

### Phase 3 — Long Lists Virtualization
- Scope:
  - Virtualize long activity lists in `TimelineView` and task grids using `@tanstack/react-virtual` (or `react-virtualized` if preferred), with dynamic row heights handled via measurement.
  - Keep keyboard/mouse interactions intact (click, edit, drag areas untouched).
- Acceptance:
  - Smooth scroll and low CPU usage with thousands of activities.
  - No visual regressions; selection/edit actions still work.
- Notes:
  - Implement behind a feature flag if necessary; start with read‑only lists, then extend to draggable grids.

### Phase 4 — API Proxy (T1)
- Scope:
  - Add serverless `/api/*` endpoint to proxy external AI providers; move all client OpenAI calls behind this proxy.
  - Token‑based auth (per‑user token or workspace key) sent only to the backend.
  - Dev: local proxy; Prod: deploy serverless (Vercel/Netlify) or a tiny Node service.
- Acceptance:
  - Browser never contacts `api.openai.com` directly.
  - Integration test: hitting proxy with mocked token returns mocked response.
  - No API keys in client bundle; env loaded only on server side.
- Notes:
  - Introduces a single service module for API calls (`@shared/services/api`).

### Phase 5 — Final Code Split Polish
- Scope:
  - Audit and further split heavy sub‑routes/components (meeting editor, charts) using `import()` boundaries.
  - Ensure Suspense fallbacks are consistent and accessible.
- Acceptance:
  - Route chunk sizes are within target; analyzer artifact checked into CI as a build artifact.

---

## Work Breakdown & Tasks

Phase 1
- Add React Router; create `app/routes/Timeline.tsx`, `Agent.tsx`, `DeepL.tsx`, `Settings.tsx`.
- Wrap with `<Suspense fallback={...}>`; convert imports to `React.lazy`.
- Introduce `AppProviders` to hold state hooks and context providers.
- Add route tests and a smoke e2e for navigation.

Phase 2
- Read `location.search` and route params to derive `taskId`.
- On mount, locate task via `taskLookup` and open `TaskModal`.
- On open/close, update URL with `history.pushState`/router navigation.
- Tests for deep link open/close and 404 fallback.

Phase 3
- Add `@tanstack/react-virtual`.
- Virtualize timeline activity list; measure heights; ensure selection/edit workflows intact.
- Add virtualization story or playground to validate performance.

Phase 4
- Scaffold `/api/openai` proxy: validate token, forward request, strip PII headers, observability.
- Add Vite dev proxy for `/api` to local server.
- Swap frontend calls to use `@shared/services/api` instead of direct provider.
- Integration test with mocked response.

Phase 5
- Analyze bundles; split heavy components; add analyzer script to CI.
- Polish Suspense fallbacks and loading states.

---

## Risks & Mitigations
- Routing regressions: keep page shells thin; write smoke tests early.
- Virtualization + drag/drop: gate behind flag until interaction parity verified.
- API proxy deployment: choose a target (Vercel/Netlify) and ensure env management is documented.

---

## Acceptance Criteria Checklist
- Router in place; pages lazy‑loaded; navigation via URL works.
- Deep link to tasks via query or path opens `TaskModal`.
- Long lists remain smooth (>1k activities) with virtualization.
- All AI calls go through `/api/*`; no provider domains in browser network.
- Bundle analyzer shows clear per‑route chunks; artifacts stored from CI.

---

## Next Step (Proposed)
Begin Phase 1: introduce React Router, split pages, add `React.lazy` + `Suspense`, and wire a minimal `AppProviders`. Once Phase 1 lands, we’ll proceed to Phase 2 (deep linking) and I’ll remind you of the new phase.

