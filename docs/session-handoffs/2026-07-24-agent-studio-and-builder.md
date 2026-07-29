# Made Solid Studio Agent Studio and builder handoff — 2026-07-24

## Purpose

This is a redacted continuation note for a future Codex/Codespaces/tmux session. It records the decisions and implementation state from the Agent Studio refinement work without storing private preview links, tokens, personal account details, or raw model activity.

## Product model agreed in this session

- **Builder foundation**: tested template code and locked package boundary that generated websites start from.
- **Built-in capability**: reusable, tested foundation behaviour, such as viewport motion or brand introduction.
- **Agent package**: a versioned release of the foundation plus its Markdown builder contract and instructions.
- **Build direction**: scoped input for one private test or prospect build. It must not silently modify the shared package.
- Complete prospect builds use only the published package. Homepage/page tests may use a published or test-ready package.

## Agent Studio

- Agent Studio has Refine and Agent Architecture sections.
- The Architecture view exposes package versions, proposal/review/promotion workflow, capability boundaries, protected source files, and popup source viewers.
- The Refine view treats a selected prospect as a private test harness. Build activity, diagnostics, and evidence are scoped to the active run; earlier runs remain in history.
- Completed test directions expand into the source files changed by that run. Edited source compares with the previous saved test and highlights the changed region; whole-file additions are labelled without artificial line highlighting.
- Inherited package behaviour is collapsed by default. It states the package lineage and exposes capabilities only when opened.

## Agent packages and migrations

- `20260724110000_agent_package_versions.sql` adds versioned agent packages, proposals, package worker functions, and builder-run package pinning.
- `20260724123000_brand_intro_agent_package.sql` creates **v5 test-ready**, derived from v4, for the brand-introduction capability.
- The Test-only refinement picker defaults to the latest test-ready package, then the published package.
- v5 must be reviewed through a private homepage test before any future promotion decision. It is intentionally test-only.
- `20260729130000_next_builder_foundation_v2.sql` publishes the v6 Next.js component foundation
  and supersedes the earlier vanilla static-file package for new runs. Historic runs and their
  artifacts remain immutable.

## Generated-site architecture

- The protected foundation pins Next.js App Router, React, strict TypeScript, Tailwind, Base UI,
  Lucide, CVA, formatting, linting, typing, and static export.
- Codex owns each site’s visual tokens, UI primitives, patterns, sections, navigation, layouts, and
  pages. The foundation locks behaviour and tooling, not a Bootstrap-style appearance.
- Every manifest records clean public routes, App Router source paths, exported output paths,
  component layers, exact responsive evidence, and a static-marketing, managed-forms, or
  managed-Next.js production runtime profile.
- Private previews are compiled static exports. Production-only services are described through
  explicit adapters and `src/BUILD_NOTES.md`; the preview never pretends a backend exists.

## Built-in capabilities

### Motion runtime

- Local `worker/builder-template/src/components/foundation/site-runtime.tsx` reveals headings and
  containers as they enter view and can animate factual metrics marked with `data-counter`.
- It respects `prefers-reduced-motion`; no remote motion dependency is used.

### Brand introduction (v5 test package)

- The local runtime looks for the real header logo marked with `data-siteforge-brand-logo`.
- On first visit where session storage is available, it shows the approved logo briefly, then animates it into the real navigation logo.
- It supports a default mark treatment and an optional quieter treatment via `data-siteforge-intro="quiet"` on `<html>`.
- It skips for reduced-motion users, never fakes loading progress, and does not create a generic logo.
- Builder contract, template instructions, worker prompt, and quality checks require the real header-logo target for new builds.

## Private preview fix

Supabase Edge Functions intentionally rewrite HTML GET responses to plain text. The preview service now returns an authenticated JSON document representation when queried with `render=srcdoc`; `src/PreviewFrame.tsx` fetches that payload and renders it inside the existing sandboxed iframe. Do not navigate directly to a Supabase preview URL: open it through Made Solid Studio’s **Open preview** action.

## Worker/runtime files worth reading first

- `worker/codex-builder-contract.md`
- `worker/builder-template/AGENTS.md`
- `worker/builder-template/feature-contracts/component-architecture.md`
- `worker/builder-template/feature-contracts/runtime-profiles.md`
- `worker/builder-template/src/components/foundation/site-runtime.tsx`
- `worker/builder-worker.mjs`
- `worker/agent-package-worker.mjs`
- `supabase/functions/siteforge-preview/index.ts`
- `src/App.tsx` (Agent Studio and builder run UI)

## Checks recently run

- `npm run test:worker`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Focused Playwright responsive and accessibility checks were also run during the session.

## Start locally

```bash
npm run start:local
```

If Vite reports port 5173 already in use, locate the existing process before starting another server.
