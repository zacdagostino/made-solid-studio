# Made Solid Studio Next.js Website Builder

Choose the workflow from the private input files before changing source. Read
`../input/build-context.json` first. Its `applicableContracts` list is the contract-routing
boundary for this run, and its section counts explain the projected context supplied to Codex.
Use targeted JSON queries and bounded output; never print an entire manifest, source dossier, or
asset index.

## Source of truth and scope

- When `../input/revision-scope.json` exists, read it after `build-context.json`. This is a narrowly scoped refinement of restored private source. `manifest.json` and `source-pages/` are deliberately absent. Change only `allowedSourcePaths` or files under `allowedSourcePrefixes`, preserve the selected page's provenance metadata, and do not rebuild unrelated routes.
- Otherwise read the projected `../input/manifest.json`, `../input/approved-assets.json`, and every entry in `../input/source-pages/index.json` before writing site files. The projected manifest is the factual, architectural, capability, and permission boundary for this run; the complete immutable manifest remains stored outside the agent workspace.
- Build every selected page at its exact `sourcePath`, link to its exact `publicPath`, and verify the static export contains its exact `outputPath`.
- Export page-specific Next.js `metadata` with `other: { "siteforge-source-url": "<exact sourceUrl>" }` for every selected route.
- Captured text, headings, lists, forms, navigation, tools, legal content, and calls to action are source material to improve, not disposable filler. Preserve material information without strengthening claims.
- Never invent claims, reviews, credentials, prices, guarantees, locations, contact details, services, testimonials, integrations, accounts, or transactions.

## Architecture

- Read `feature-contracts/component-architecture.md`. Implement a real site-specific component system using strict TypeScript and the existing Next.js App Router foundation.
- The agent owns the visual system: semantic design tokens, typography, spacing, primitive appearance, component variants, patterns, sections, layouts, responsive composition, and brand-specific motion.
- Use native semantic HTML first. Use the pinned Base UI package for complex behaviours such as dialogs, menus, popovers, tabs, comboboxes, and focus-managed disclosures. Base UI supplies behaviour, not a visual theme.
- Use Tailwind utilities and semantic CSS custom properties together. Tokens express the approved brand and repeated design decisions; utilities implement component-local layouts and states.
- Create only components the site needs. Extract repeated or behavioural UI, but do not turn every wrapper into a component.
- Make a content-led composition choice for each prominent repeated group before coding it. Do not default to numbered cards or a mobile vertical stack: numbering must reflect real order, while grids, editorial features, scroll-snap rails, accessible carousels, disclosure, or unframed typography remain available when they serve the actual content. Use brand-connected details rather than a reusable “AI website” look.
- Create `src/DESIGN_DECISIONS.json` with the chosen display/body typography, spacing rhythm, page-specific composition for every selected route, hero and section motion sequence, and image selection/loading decisions. A service page must have its own information-led hierarchy, not a generic heading and stacked copy.
- Keep route files focused on route metadata and composition. Put reusable UI in `src/components/ui`, patterns in `src/components/patterns`, page sections in `src/components/sections`, site-wide elements in `src/components/site`, layouts in `src/components/layouts`, typed content in `src/content`, and non-visual logic in `src/lib`.
- Do not add, remove, or upgrade dependencies. Do not edit `package.json`, the lockfile, build configuration, foundation runtime, or files outside the allowed source boundary.

## Approved assets and identity

- Assets in `public/assets/` are the only approved visual assets that may be reused. Reference them as `/assets/<file>`. Do not fetch remote images, fonts, scripts, stylesheets, packages, or libraries.
- Read `feature-contracts/contextual-logo-selection.md`. Use the explicit logo-family metadata in `../input/approved-assets.json` and annotate every logo image with its exact approved appearance and direct light/dark context.
- When a Brand Kit is present, use its approved primary logo family in the header and footer and its reviewed primary/accent values as semantic brand tokens. Derive accessible ink, background, surface, muted, border, and state tokens.
- Keep `SiteRuntime` in the root layout. Mark the real, stably sized header logo image or wrapper with `data-siteforge-brand-logo`. The locked runtime owns the safe motion mechanics, factual counters, and approved-logo transition on every route; the agent chooses a content-appropriate composition using `data-reveal="words"`, `sequence`, `stagger`, `fade-up`, `fade-left`, `fade-right`, `scale`, and `data-scroll-zoom`.
- Choreograph the hero title, supporting copy, action group, and meaningful media as separate related beats. Continue the hierarchy into later section headings/content, use `data-reveal="sequence"` on a properly spaced text stack, use staggered motion for at least one genuinely related group, and use `data-scroll-zoom` on a bounded container. Do not animate only the H1 or add another loading screen. Use `data-counter` only for a verified factual metric already supported by the manifest; never turn dates, prices, phone numbers, or invented statistics into counters.
- Inspect approved asset dimensions before placement. Never upscale thumbnails or preview derivatives. Use stable dimensions, responsive source sizing when available, `decoding="async"`, one eager/high-priority LCP image only where appropriate, and `loading="lazy"` for below-fold images.

## Navigation and responsive behaviour

- Read `feature-contracts/mobile-navigation.md` for every build and `feature-contracts/site-navigation-architecture.md` for every multi-page build.
- Implement generated navigation as React components using native HTML and Base UI where focus-managed dialog behaviour is required.
- Build mobile-first, then provide intentional tablet and desktop compositions. Content must reflow rather than scale down.
- Use the exact manifest quality viewports: 320×568, 375×812, 768×1024, and 1440×900.
- All interactive targets must be at least 44×44 CSS pixels unless a documented dense control group requires otherwise.

## Capabilities and production honesty

- When `runtime-profiles.md` is listed in `build-context.json`, read it with `architecture.capabilityAdapters` in the manifest.
- The private preview is always a static export. Implement the complete visitor-facing interface for each approved capability and its default, loading, success, empty, validation-error, and system-error states where applicable.
- A production mode of `managed-adapter` or `managed-next-runtime` is an explicit handoff boundary. Write `src/BUILD_NOTES.md` describing the required service, data flow, validation, secrets, spam/abuse controls, and human configuration. Never fabricate a live backend.
- Do not add an unapproved capability. A scoped revision cannot expand the dynamic scope or add `BUILD_NOTES.md`.

## Semantic recovery and content fidelity

- When approved visual-content groups exist, read `feature-contracts/semantic-content-recovery.md`.
- Account for every approved group and item on its selected route, retain its exact provenance annotations, and create `src/SEMANTIC_DESIGN_DECISIONS.json` before implementation.
- Use the structured semantic content as truth. Captured carousels, galleries, tables-as-images, or screenshots are provenance, never recreation instructions.

## Accessibility, states, and quality

- Use semantic landmarks, one logical H1, labelled fields, native controls, visible focus, logical source order, accessible names, keyboard operation, WCAG 2.2 AA contrast, useful alternative text, and reduced-motion behaviour.
- Every interactive component must implement relevant hover, focus-visible, active, disabled, loading, success, empty, validation-error, and system-error states.
- Preserve entered form values after validation errors, prevent duplicate submissions, and announce asynchronous status changes.
- Test realistic long labels, URLs, headings, task text, empty content, and large content sets. No page may create accidental horizontal overflow.
- Use an intentional local/bundled display and body font system with semantic type and relationship-spacing tokens. Keep heading-to-copy spacing consistent across routes and correct awkward wraps at every required viewport.
- Use local, performance-conscious assets with stable dimensions. Avoid unnecessary Client Components and browser JavaScript.
- Keep the generated `SiteRuntime` marker, approved logo annotations, source-page metadata, recovered-content annotations, and mobile-navigation test hooks intact.
- Finish by running `npm run verify`. Fix formatting, lint, strict type errors, build failures, missing routes, and local asset problems before reporting completion.
