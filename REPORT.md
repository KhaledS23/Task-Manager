# Task Manager Audit Report (v1.0)

| Check | Outcome | Notes |
| --- | --- | --- |
| `npm run build` | ✅ Pass (warnings) | Supabase module still bundled despite dynamic import; main chunk 1.02 MB; bundle warning above 500 kB |
| Lint | ⚠️ Not configured | No eslint/formatter scripts or configs detected |
| Tests | ⚠️ Not configured | No unit/integration/e2e scripts present |
| Type check | ⚠️ Not configured | No TS/type tooling |
| `npm audit --production` | ❌ 1 high, 3 moderate | `jspdf@2.5.2`, `dompurify@<3.2.4`, `react-quill`/`quill` vulnerabilities |
| Dependency freshness | 11 outdated | React 18.x (latest 19.x), Vite 4.x (latest 7.x), Tailwind 3.x (latest 4.x), etc. |
| Bundle size | Largest chunk 1.03 MB gz 304 kB | React Quill + phase board + DeepL workspace increase payload; plan code-splitting |
| LOC snapshot | 5,212 code, 57 files (`cloc src`) | Meeting editor + filesystem services add footprint; monolith archived in `deprecated/` |

## System Overview

```
[Vite 4.x + React 18 App]
  ├─ shell: src/app/App.jsx (UI orchestration, AI calls, sync timers)
  ├─ features/
  │   ├─ tasks (hooks + modals, localStorage persistence)
  │   ├─ meetings (hooks, attachments/notes, rich editor)
  │   ├─ projects (CRUD, color metadata, attachment registry)
  │   └─ timeline (TimelineView, phase board, attachments panel)
  ├─ pages/
  │   ├─ dashboard/TimelinePage (wraps TimelineView)
  │   └─ agent/AgentPage (LLM assistant UI)
  ├─ shared/
  │   ├─ utils (constants, chart helpers, LLM context builder)
  │   ├─ services
  │   │   ├─ storage/localStorage (JSON wrapper)
  │   │   ├─ filesystem (IndexedDB-backed directory handles)
  │   │   └─ cloud/supabase (dynamic import from CDN)
  │   └─ components/ui (Button, Modal, Loading – currently unused)
  └─ assets/logo.avif
```

**Data flow**: `App.jsx` composes custom hooks (`useTasks`, `useMeetings`, `useProjects`) → state stored in localStorage (`StorageService`) → optionally synced to Supabase via push/pull helpers. Timeline/Agent/AI features reuse normalized data from shared utils; there is no backend/CI.

## Dependency Overview

- React 18.3 + Vite 4.5, Tailwind 3.4 for styling.
- Framer Motion, Lucide icons, date-fns for UI/UX.
- CSV/PDF exports via `papaparse`, `file-saver`, `jspdf`. Rich text with `react-quill` (pulls vulnerable `quill`).
- Supabase JS dynamically imported from esm.sh CDN (client-side), exposing workspace URL/key.
- No server/runtime dependencies; everything executes in the browser.

## Directory Tree Diff (pre → post audit)

```
Removed from root → archived under ./deprecated/
  - src/App.jsx, src/App.jsx.backup → deprecated/legacy-monolith/*.remove.me
  - src/update-openai-model-src.patch → deprecated/legacy-monolith/
  - dist/ build output → deprecated/build-artifacts/dist.remove.me
  - main (empty stub), .DS_Store files → deprecated/misc/*.remove.me
  - src/assets/.DS_Store → deprecated/misc/src-assets.DS_Store.remove.me
```

Active tree (depth≤2):
```
./
  src/{app,features,pages,shared,assets,index.css,main.jsx}
  deprecated/{legacy-monolith,misc,build-artifacts}
  docs: AI_AGENT_INSTRUCTIONS.md, PROJECT_STRUCTURE_PLAN.md, IMPLEMENTATION_SUMMARY.md, RESTRUCTURING_SUMMARY.md, brainstorming.md, timeline-*.md
```

## Top 10 Weaknesses

| # | Issue | Severity | Impact | Root Cause | Fix Outline | References |
| - | --- | --- | --- | --- | --- | --- |
| 1 | `App.jsx` still a ~800-line god component orchestrating UI, AI, storage, sync | High | High maintenance cost, hard to test, inhibits reuse | Legacy refactor incomplete; logic not split into feature modules | Extract routing/layout shell, move AI + sync flows into dedicated hooks/services; align with feature folders | `src/app/App.jsx:1` |
| 2 | Client-side OpenAI calls using stored API key | High | Leaks secrets, no request validation, user pays for compromised key | Direct `fetch` to OpenAI in UI without proxy/auth | Introduce backend proxy (Cloudflare Worker/Edge function); store keys server-side; throttle/observability | `src/app/App.jsx:330-399`, `src/pages/agent/AgentPage.jsx:80-125` |
| 3 | Supabase helper exported statically + dynamically | High | Vite bundles Supabase for all users, cloud sync can break offline builds | Barrel export `export * from './cloud/supabase'` defeats dynamic import | Remove barrel export; expose lazy loader returning functions; gate behind settings feature flag | `src/shared/services/index.js:1-2`, `src/app/components/SettingsPage.jsx:176-207` |
| 4 | No linting, formatting, or type checks | High | Bugs slip unnoticed; inconsistent style; on-ramp friction | Missing eslint/prettier/config/scripts | Add eslint + prettier configs, enforce via `npm run lint` and pre-commit hook | `package.json` |
| 5 | No automated tests or CI | High | Regression risk; manual verification only | No test harness, coverage, or pipelines | Bootstrap Vitest/Jest for hooks/utils, React Testing Library for UI; add GitHub Actions workflow | `package.json`, repo root |
| 6 | Build artifacts & OS cruft tracked; `.gitignore` absent | Medium | Inflated repo, merge noise, risk of leaking secret builds | Lack of ignore rules & cleanup | Add `.gitignore` (node_modules, dist, *.log, .DS_Store); prune archived artifacts after approval | `deprecated/build-artifacts/dist.remove.me`, `deprecated/misc/*.remove.me` |
| 7 | Bundle size now 1.0 MB main chunk | Medium | Phase board + Quill editor raise initial payload | No code-splitting, agent/timeline/Quill shipped in primary bundle | Split routes (timeline/agent/settings), lazy-load Quill & heavy icons | Build log, `src/features/timeline/components/TimelineView.jsx` |
| 8 | Legacy monolith + patch file still in repo | Medium | Confusion for contributors, larger installs | Old files never deleted after refactor | Delete after approval; rely on feature modules; document migration in CHANGELOG | `deprecated/legacy-monolith/*` |
| 9 | App shell still centralizes modal/task state | Medium | Hard to reason about interactions, props drilling proliferates | Historic extraction left state buckets inside `App.jsx` | Introduce context/provider layer, move modals into feature scopes | `src/app/App.jsx` |
|10 | Local storage sync relies on `window.location.reload()` | Low | Janky UX, interrupts work, loses unsaved state | Simplistic reconciliation in Supabase pull handler | Replace with state hydration & diff merge; show toast/status without reload | `src/app/App.jsx:202-247` |

## Additional Observations

- `CLEANUP_PLAN.md` enumerates archived files with hashes for easy restoration.
- `IMPROVEMENT_PLAN.md` captures prioritized backlog by theme (architecture, frontend, security, DevEx, etc.) with Impact/Effort and acceptance criteria.
- `agents.md` provides a structured hand-off: hygiene, FE/BE tasks, coverage target ≥80%, verification checklist.
- Security posture: API + Supabase credentials persist in localStorage/sessionStorage without encryption; recommend secrets scanning and secure storage.
- Existing docs (`IMPLEMENTATION_SUMMARY.md`, `RESTRUCTURING_SUMMARY.md`) overstate completion; align messaging with real status during next iteration.

## Feature Updates

- Timeline now supports a **phase board**: tasks can be dragged across phases and the column order persists via settings.
- Meetings gained a **rich note editor** with inline layout, compact controls, and attachment management embedded in the timeline experience.
- Introduced a **DeepL workspace** with translation and writing modes calling the API key stored in settings.
- Settings exposes a **local attachment folder picker** leveraging the File System Access API; directory handles persist via IndexedDB and rehydrate on launch.
- Task and project modals were refreshed with compact typography, rounded surfaces, and gradient shells to match the new visual language.
