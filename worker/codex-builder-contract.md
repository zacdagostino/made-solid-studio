# Made Solid Studio Codex Builder Contract v8

The builder receives an approved immutable Build Manifest, a private content dossier for every selected source page, and only the approved assets staged by the protected worker. Those inputs are the source of truth for facts, information architecture, capabilities, permissions, visual identity, routes, production runtime requirements, and unresolved questions.

## Engineering foundation

Every new build uses the locked Next.js App Router foundation with strict TypeScript, Tailwind CSS, semantic CSS tokens, native HTML, Base UI for difficult headless interactions, Lucide icons, deterministic static export, and pinned dependencies. The builder cannot install packages or change framework, compiler, quality, or deployment configuration.

The foundation locks mechanics, not appearance. Codex creates the business-specific visual system and component architecture: tokens, UI primitives, patterns, sections, site-wide navigation, layouts, and pages. It owns typography, spacing, variants, composition, responsive transformation, and brand expression. It must not preserve the starter appearance, assemble a generic block catalogue, or produce repetitive AI-style cards and decorative effects.

Use native semantic HTML whenever it supplies the required behaviour. Use Base UI for patterns that require coordinated keyboard navigation, focus management, modal behaviour, or collision positioning. Base UI is an unstyled behavioural foundation; generated components own all visual design.

## Factual and asset boundary

The builder must not imitate the captured website, invent or strengthen business claims, reuse an asset without approved guidance, publish output, contact a prospect, or resolve uncertainties by guessing.

When a Brand Kit exists, use its approved primary logo family in the header and footer, choose a contrast-safe approved appearance for each direct surface, and use the reviewed primary and accent values as brand tokens. Derive accessible ink, background, surface, muted, border, and state tokens. Never replace the identity with a generic mark or use third-party/client marks as the organisation logo.

Every selected source page is required. The source-page index assigns an exact clean `publicPath`, App Router `sourcePath`, and static-export `outputPath`. Export page-specific metadata containing the exact `siteforge-source-url`. Rewrite and condense copy for clarity while retaining material services, operational details, calls to action, forms/tools, legal content, and resources without strengthening claims.

## Capabilities and runtime profiles

The private preview is always a static export. `architecture.productionRuntime` declares whether the reviewed production implementation is `static-marketing`, `managed-forms`, or `managed-next-runtime`.

For approved server-backed capabilities, implement the complete visitor-facing interface and relevant default, loading, success, empty, validation, and system-error states. Create `BUILD_NOTES.md` with the typed adapter, service, data, validation, authorization, secret, abuse-prevention, retention, failure, and human-configuration boundary. A preview must never fabricate a live submission, booking, account, payment, record, or backend.

## Recovered semantic content

`approvedVisualContentGroups` contains human-reviewed information recovered from captured images. Its structured content is semantic truth; source presentation is provenance only.

Groups are grouped deterministically by source page, section context, and semantic role. Each group keeps `integrationInstruction: "builder_decides"` and `presentationInstruction: "builder_decides"` so the builder owns its new accessible composition.

Every matching group and item must appear once on its selected route with exact provenance annotations. Before implementation, create `SEMANTIC_DESIGN_DECISIONS.json` with the actual content shape, brand connection, hierarchy, responsive transformation, and a purposeful signature detail. Codex decides whether each group joins an existing composition or creates a new one and owns its accessible design. It must not rebuild a captured screenshot, image table, carousel, slider, or gallery merely because the source used one.

## Built-in runtime behaviour

The locked React `SiteRuntime` provides progressive viewport reveals, counters for explicitly marked factual metrics, and a short first-visit introduction using the real approved header logo. Keep it mounted in the root layout and mark the real header logo or wrapper with `data-siteforge-brand-logo`.

Use motion to support hierarchy and scanning. Do not invent statistics, animate arbitrary numbers, add a second loader, show fake progress, or hide essential content. All generated motion and interaction must respect `prefers-reduced-motion`.

## Navigation

Mobile navigation is a required generated React feature governed by `feature-contracts/mobile-navigation.md`. Codex owns the icon, composition, visual system, and motion; the behavioural contract requires an icon-only leading trigger, accurate accessible name and expanded state, focus-managed open surface, visible close control, vertical route hierarchy, Escape/backdrop/route dismissal, focus restoration, reduced motion, and desktop navigation.

Multi-page navigation is governed by `feature-contracts/site-navigation-architecture.md`. Use exact clean paths, stable primary destinations, meaningful parent/child relationships, and a route graph in which every generated page is reachable from the homepage without crowding the global header.

## Quality and delivery

Generated source must pass formatting, ESLint, strict TypeScript, and the production Next.js build. The protected worker then verifies source provenance, selected-route coverage, component runtime markers, approved logo use, recovered-content fidelity, internal links, navigation consistency and reachability, responsive rendering, overflow, touch targets, keyboard navigation, mobile-menu focus and dismissal, local assets, console errors, and axe results.

Required viewports are 320×568, 375×812, 768×1024, and 1440×900. Closed and open compact-navigation evidence is required where applicable.

The worker saves source, compiled files, browser evidence, diagnostics, and quality results privately. A generated preview is not publication. External sharing and production deployment remain separate human-approved workflows.
