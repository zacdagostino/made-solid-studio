# Made Solid Studio Codex Builder Contract v8

The builder receives an approved immutable Build Manifest, a private content dossier for every selected source page, and only the approved assets staged by the protected worker. Those inputs are the source of truth for facts, information architecture, capabilities, permissions, visual identity, routes, production runtime requirements, and unresolved questions.

## Engineering foundation

Every new build uses the locked Next.js App Router foundation with strict TypeScript, Tailwind CSS, semantic CSS tokens, native HTML, Base UI for difficult headless interactions, Lucide icons, deterministic static export, and pinned dependencies. The builder cannot install packages or change framework, compiler, quality, or deployment configuration.

The foundation locks mechanics, not appearance. Codex creates the business-specific visual system and component architecture: tokens, UI primitives, patterns, sections, site-wide navigation, layouts, and pages. It owns typography, spacing, variants, composition, responsive transformation, and brand expression. It must not preserve the starter appearance, assemble a generic block catalogue, or produce repetitive AI-style cards and decorative effects.

A short workspace direction is an outcome-level creative brief, not a complete technique specification. When asked for a very well-designed page or high-quality animation, Codex must independently develop a coherent page-specific art direction and carry it through typography, scale, composition, depth, responsive behaviour, motion, and interaction. The workspace member does not need to enumerate parallax, sticky sequences, scroll-linked transforms, pointer-responsive light, masks, layered media, or ambient fields before Codex may use them. Those are available techniques rather than mandatory effects; select and combine only what strengthens the approved content and brand. Required runtime markers are a baseline, not the creative ceiling. Generated page-owned client components may implement custom effects with the locked React/CSS platform, stable performance, static reduced-motion fallbacks, and no added dependency. A generic hero followed by interchangeable card or text sections is not an acceptable interpretation of an explicit request for exceptional design.

Composition begins with content shape, not a preferred component. Distinguish ordered information from unordered collections, short items from long editorial material, simultaneous comparison from optional browsing, and dense desktop content from a deliberate mobile transformation. Do not add numbers where no sequence exists or turn every mobile group into a vertical stack. The agent may choose asymmetric grids, editorial features, horizontal scroll-snap rails, accessible non-rotating carousels, disclosure, typographic treatments, or quieter unframed layouts when those choices serve the content. Expressive details—such as a designed quote glyph for quotation-shaped content—must connect to the content and approved brand rather than become a repeated template.

A horizontal mobile rail is not a default responsive escape hatch. Fit two to four concise, low-density containers within the mobile width when they remain readable at a smaller size; reserve horizontal browsing for item counts, media, comparison width, or content density that genuinely benefit from progressive disclosure. Style every document and component scrollbar with accessible semantic track, thumb, hover, and active treatments without hiding it.

Choose and document a deliberate display/body typography system, readable measures, and consistent relationship-based vertical rhythm. Give every selected route a purposeful page composition; service pages are not allowed to collapse into a generic heading and stacked copy. Use local or bundled font resources only.

Use native semantic HTML whenever it supplies the required behaviour. Use Base UI for patterns that require coordinated keyboard navigation, focus management, modal behaviour, or collision positioning. Base UI is an unstyled behavioural foundation; generated components own all visual design.

## Factual and asset boundary

The builder must not imitate the captured website, invent or strengthen business claims, reuse an asset without approved guidance, publish output, contact a prospect, or resolve uncertainties by guessing.

When a Brand Kit exists, use its approved primary logo family in the header and footer, choose a contrast-safe approved appearance for each direct surface, and use the reviewed primary and accent values as brand tokens. Derive accessible ink, background, surface, muted, border, and state tokens. Never replace the identity with a generic mark or use third-party/client marks as the organisation logo.

Every selected source page is required. The source-page index assigns an exact clean `publicPath`, App Router `sourcePath`, and static-export `outputPath`. Export page-specific metadata containing the exact `siteforge-source-url`. Rewrite and condense copy for clarity while retaining material services, operational details, calls to action, forms/tools, legal content, and resources without strengthening claims.

Give every route and internal link a meaningful visitor-facing name derived from approved page content. Replace weak source placeholders such as Blank, Unnamed page, Untitled, or raw path labels like `/blank` in metadata titles, H1s, navigation, breadcrumbs, cards, and contextual links. Keep the assigned route and evidence paths unchanged.

## Capabilities and runtime profiles

The private preview is always a static export. `architecture.productionRuntime` declares whether the reviewed production implementation is `static-marketing`, `managed-forms`, or `managed-next-runtime`.

For approved server-backed capabilities, implement the complete visitor-facing interface and relevant default, loading, success, empty, validation, and system-error states. Create `BUILD_NOTES.md` with the typed adapter, service, data, validation, authorization, secret, abuse-prevention, retention, failure, and human-configuration boundary. A preview must never fabricate a live submission, booking, account, payment, record, or backend.

## Recovered semantic content

`approvedVisualContentGroups` contains human-reviewed information recovered from captured images. Its structured content is semantic truth; source presentation is provenance only.

Groups are grouped deterministically by source page, section context, and semantic role. Each group keeps `integrationInstruction: "builder_decides"` and `presentationInstruction: "builder_decides"` so the builder owns its new accessible composition.

Every matching group and item must appear once on its selected route with exact provenance annotations. The originating `assetId` remains private provenance only: an image that supplied approved recovered content must never be staged, rendered, copied, or reused anywhere in the generated site. Before implementation, create `SEMANTIC_DESIGN_DECISIONS.json` with the actual content shape, brand connection, hierarchy, responsive transformation, and a purposeful signature detail. Codex decides whether each group joins an existing composition or creates a new one and owns its accessible design. It must not rebuild a captured screenshot, image table, carousel, slider, or gallery merely because the source used one.

## Built-in runtime behaviour

The locked React `SiteRuntime` provides a slower motion vocabulary and an every-route transition using the real approved header logo. Keep it mounted in the root layout and mark the real, stably sized header logo or wrapper with `data-siteforge-brand-logo`. On that marked element declare `data-siteforge-intro-surface` with the exact contrasting CSS colour directly behind the selected logo appearance, `data-siteforge-intro-ink` with an exact colour providing at least 4.5:1 text contrast, and `data-siteforge-intro-copy` with a concise line chosen for this business. Prefer an approved slogan; otherwise use restrained evidence-grounded copy without inventing a claim. Declare compact alignment as `data-siteforge-compact-logo-alignment="center"` or `"flow"`. A centred compact logo must be geometrically centred to the viewport independently of unequal side controls; flow alignment remains valid when that is the intentional composition. Compose motion intentionally with `data-reveal="words"` for a short important heading, `data-reveal="sequence"` on a stacked text group, `data-reveal="stagger"` on a repeated-item parent, `data-scroll-zoom` on a bounded depth composition, or `data-reveal="fade-up"`, `fade-left`, `fade-right`, or `scale` on individual elements. Use at least three fitting treatments across the generated site; do not apply one generic effect to everything. Mark only verified factual metrics with `data-counter`, preserving their visible prefix, suffix, and final value.

Use motion to support hierarchy, sequence, and scanning. Let content determine the treatment: words may enter in reading order, related cards or process steps may stagger, and directional or scale motion may reinforce composition without becoming decorative noise. Do not split long body copy, animate every element, invent statistics, animate arbitrary numbers, add a second loader, show fake progress, or hide essential content. All generated motion and interaction must respect `prefers-reduced-motion`.

The foundation's server-rendered loading cover must precede page paint, use the logo's declared contrasting surface, and move with a deliberate slow decelerating ease. The hero must choreograph its title, supporting copy, actions, and meaningful media as separate related beats rather than animating only the H1. Prepare those reveal states while the cover is present, then start their visible entrance only after the logo handoff and cover removal. Subsequent section headings/content, at least one sequential text stack, one scroll-responsive depth container, and one related repeated group also need intentional motion. Use the slower locked easing/delay vocabulary. Compact navigation must animate its surface both in and out, then sequence its approved logo, primary links, and secondary controls in reading order. The first hero beat cannot begin until `siteforge:route-transition-complete` has fired and the loading surface is gone.

Treat both navigation-logo appearances as immediate interface assets. Render the header image with stable dimensions, eager loading, and high fetch priority. Mark the drawer mark with both `data-siteforge-navigation-logo` and the first `data-sf-navigation-item`; when it uses a different local approved source, preload that source in the initial document and declare it through `data-siteforge-navigation-logo-src` on the header mark. The locked runtime pre-decodes that source and holds the drawer item sequence until the mounted mark is ready. Do not bypass its readiness state with independent route or logo visibility rules. Refreshing a route and opening the drawer for the first time must not expose an undecoded logo, an empty logo box, or links animating ahead of the mark.

Choose the highest-resolution approved image appropriate to each slot and never upscale a thumbnail or preview derivative. Give images stable dimensions, responsive source sizing where available, useful alt text, asynchronous decoding, eager/high-priority loading only for the genuine above-fold primary visual, and lazy loading below the fold.

## Navigation

Mobile navigation is a required generated React feature governed by `feature-contracts/mobile-navigation.md`. Codex owns the icon, composition, visual system, and motion; the behavioural contract requires an icon-only leading trigger, accurate accessible name and expanded state, focus-managed open surface, visible close control, vertical route hierarchy, Escape/backdrop/route dismissal, focus restoration, reduced motion, and desktop navigation.

Multi-page navigation is governed by `feature-contracts/site-navigation-architecture.md`. Use exact clean paths, stable primary destinations, meaningful parent/child relationships, and a route graph in which every generated page is reachable from the homepage without crowding the global header.

## Quality and delivery

Generated source must pass formatting, ESLint, strict TypeScript, and the production Next.js build. The protected worker then verifies source provenance, selected-route coverage, component runtime markers, approved logo use, recovered-content fidelity, internal links, navigation consistency and reachability, responsive rendering, overflow, touch targets, keyboard navigation, mobile-menu focus and dismissal, local assets, console errors, and axe results.

Use the projected build context efficiently. Read each applicable contract once, inspect only selected-route facts and assets with bounded Node.js or `rg` queries, and do not print whole manifests, asset inventories, source trees, or unchanged files. The builder environment provides Node.js, `rg`, `sed`, and the installed `sharp` package; do not probe for `jq` or ImageMagick. Format once before the first full verification. Run full verification no more than twice—once after implementation and once after concrete fixes—and never repeat a passing full verification without intervening source changes. Use focused checks while diagnosing. Private route tests use the balanced, medium-reasoning execution profile; whole-site and production builds retain the frontier, high-reasoning profile unless an operator explicitly overrides it.

Required viewports are 320×568, 375×812, 768×1024, and 1440×900. Closed and open compact-navigation evidence is required where applicable.

The worker saves source, compiled files, browser evidence, diagnostics, and quality results privately. A generated preview is not publication. External sharing and production deployment remain separate human-approved workflows.
