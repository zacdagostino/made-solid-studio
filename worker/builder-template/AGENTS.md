# Made Solid Studio Next.js Website Builder

Choose the workflow from the private input files before changing source.

## Source of truth and scope

- When `../input/revision-scope.json` exists, read it first. This is a narrowly scoped refinement of restored private source. `manifest.json` and `source-pages/` are deliberately absent. Change only `allowedSourcePaths` or files under `allowedSourcePrefixes`, preserve the selected page's provenance metadata, and do not rebuild unrelated routes.
- Otherwise read `../input/manifest.json`, `../input/approved-assets.json`, and every entry in `../input/source-pages/index.json` before writing site files. The manifest is the factual, architectural, capability, and permission boundary.
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
- Keep route files focused on route metadata and composition. Put reusable UI in `src/components/ui`, patterns in `src/components/patterns`, page sections in `src/components/sections`, site-wide elements in `src/components/site`, layouts in `src/components/layouts`, typed content in `src/content`, and non-visual logic in `src/lib`.
- Do not add, remove, or upgrade dependencies. Do not edit `package.json`, the lockfile, build configuration, foundation runtime, or files outside the allowed source boundary.

## Approved assets and identity

- Assets in `public/assets/` are the only approved visual assets that may be reused. Reference them as `/assets/<file>`. Do not fetch remote images, fonts, scripts, stylesheets, packages, or libraries.
- Read `feature-contracts/contextual-logo-selection.md`. Use the explicit logo-family metadata in `../input/approved-assets.json` and annotate every logo image with its exact approved appearance and direct light/dark context.
- When a Brand Kit is present, use its approved primary logo family in the header and footer and its reviewed primary/accent values as semantic brand tokens. Derive accessible ink, background, surface, muted, border, and state tokens.
- Keep `SiteRuntime` in the root layout. Mark the real header logo image or wrapper with `data-siteforge-brand-logo`. The locked runtime owns only safe progressive reveal, factual counters, and the short approved-logo introduction; it does not dictate the site's visual system.

## Navigation and responsive behaviour

- Read `feature-contracts/mobile-navigation.md` for every build and `feature-contracts/site-navigation-architecture.md` for every multi-page build.
- Implement generated navigation as React components using native HTML and Base UI where focus-managed dialog behaviour is required.
- Build mobile-first, then provide intentional tablet and desktop compositions. Content must reflow rather than scale down.
- Use the exact manifest quality viewports: 320×568, 375×812, 768×1024, and 1440×900.
- All interactive targets must be at least 44×44 CSS pixels unless a documented dense control group requires otherwise.

## Capabilities and production honesty

- Read `feature-contracts/runtime-profiles.md` and `architecture.capabilityAdapters` in the manifest.
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
- Use local, performance-conscious assets with stable dimensions. Avoid unnecessary Client Components and browser JavaScript.
- Keep the generated `SiteRuntime` marker, approved logo annotations, source-page metadata, recovered-content annotations, and mobile-navigation test hooks intact.
- Finish by running `npm run verify`. Fix formatting, lint, strict type errors, build failures, missing routes, and local asset problems before reporting completion.
