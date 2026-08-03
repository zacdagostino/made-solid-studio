# Generated component architecture

## Principle

The foundation locks dependencies, compilation, and difficult interaction behaviour. It does not lock the site's appearance. Build a new visual system for the approved business in every normal build.

## Layers

1. **Tokens** — semantic CSS custom properties for approved brand colours, derived accessible colours, typography, spacing, radii, borders, elevation, and motion.
2. **UI primitives** — native elements and small components such as `Button`, `ButtonLink`, `IconButton`, `Input`, `Textarea`, `Select`, `Container`, `Stack`, and `Cluster`.
3. **Patterns** — reusable combinations with one purpose, such as `ContactField`, `ServiceCard`, `Testimonial`, or `Breadcrumbs`.
4. **Sections** — content compositions such as a hero, service overview, process, FAQ, contact, or resource index.
5. **Site components** — header, primary navigation, compact navigation, footer, and persistent calls to action.
6. **Layouts** — page shells and content arrangements shared by related routes.
7. **Pages** — route metadata, source provenance, typed content selection, and composition.

These layers describe responsibility, not mandatory component counts. Do not create an abstraction for a one-off wrapper with no behaviour or reuse.

## Creative ownership

- Generate the site's primitive styling and variants from its approved brand and content shape.
- Do not import a predesigned block catalogue or preserve the starter visual appearance.
- Avoid generic SaaS cards, decorative gradients, excessive pills, fake badges, unsupported statistics, and repeated interchangeable section layouts.
- Components own internal layout and expose small, semantic APIs. Prefer `variant="primary"` over unrelated boolean styling props.
- A visual choice repeated across components becomes a token or documented variant, not duplicated arbitrary values.

## Content-led composition

- Before implementing a prominent section, identify its actual content shape: whether items are ordered, how many exist, how their lengths vary, what visitors compare, and whether browsing or simultaneous scanning matters. Let that shape lead the composition instead of reaching for a vertical card stack.
- Do not add ordinal numbers unless sequence, rank, chronology, or a counted process is genuinely part of the information. Unordered services, quotations, projects, people, and benefits must not look numbered merely to decorate repeated items.
- Choose from a broad responsive repertoire rather than repeating one topology: editorial feature-and-support layouts, asymmetric grids, horizontal scroll-snap rails, accessible carousels, overlapping media, typographic quotations, timelines, indexes, comparison rows, selective disclosure, and calm unframed groupings are possibilities, not required templates.
- Mobile is a distinct composition opportunity. Decide whether a group should wrap, scroll, disclose, feature one item with browsable siblings, or stack. A plain vertical stack is valid only when it best serves reading and comparison.
- Give important sections a content- and brand-connected signature detail. For quotation-shaped content this might be an oversized decorative quote glyph, expressive blockquote geometry, attribution placement, or rhythm driven by quote length; for other content it should arise from that content rather than borrowing testimonial styling.
- If a carousel or horizontal browsing rail is independently appropriate, keep a semantic list or equivalent structure, expose clear previous/next controls and position context, support touch and keyboard input, avoid automatic rotation, and keep all content available without JavaScript. Never add interaction solely to appear more designed.
- Compare neighbouring sections and the page as a whole before completion. Vary hierarchy, density, alignment, and interaction with purpose while retaining a coherent token system.
- Give secondary routes the same design attention as the homepage. A service page must have a route-specific hierarchy and composition driven by its actual service information, proof, process, related routes, and next action; it must not be a generic title followed by plain stacked copy.

## Typography and vertical rhythm

- Choose an intentional display and body type system that fits the approved brand and content. Do not leave headings and paragraphs on an undifferentiated browser-default family. Use only bundled/local assets, the existing framework font facilities, or a considered system stack; never fetch a runtime font from a remote origin.
- Define semantic font-family, weight, size, line-height, tracking, and measure tokens. Headings and body copy may use complementary families, but the pairing must remain legible, restrained, and consistent across routes.
- Define section, heading-to-copy, copy-to-action, list, and card-internal rhythm with layout `gap` tokens. Headings must never accidentally collide with their supporting text, and equal relationships must use equal spacing across pages.
- Build stacked copy as a named `Stack` or equivalent component with semantic gap tokens. When a stack uses `data-reveal="sequence"`, keep its eyebrow, heading, paragraph, and actions as direct children in reading order so the runtime can reveal them one after another without changing the spacing geometry.
- Review the full services page and at least one content-dense page at every required viewport. Fix widows, overlong measures, awkward wraps, inconsistent heading gaps, and empty areas rather than shrinking the type.

## Motion composition

- Choreograph the hero as a sequence, not a single heading effect: introduce the short title, supporting copy, primary actions, and meaningful media as distinct but related beats. At least one subsequent section must reveal its own heading/supporting content and one genuinely grouped set must use staggered item motion.
- Prefer smooth decelerating easing, readable travel, and purposeful delays. Motion should begin from a visibly composed offset and last long enough to perceive without making controls feel unavailable. Avoid linear easing, tiny near-static offsets, simultaneous page-wide reveals, and identical animation on every section.
- Use direction and order to reinforce the layout: reading order for words and navigation, spatial direction for paired media/copy, and DOM order for related items. Essential content remains present without JavaScript and immediately visible under `prefers-reduced-motion`.
- Use `data-reveal="sequence"` for at least one meaningful text stack on every generated route. Its direct children reveal in order with readable separation; do not fake a sequence with unrelated one-off delays.
- Use `data-scroll-zoom` on at least one bounded media or content container per route. The container grows smoothly as it enters the reading viewport and returns to its resting scale after it leaves; its direct children counter-scale toward neutral so the effect has depth without making copy pulse or become unreadable. Do not apply scroll zoom to the page shell, navigation, forms, or long text-only regions.
- Route changes use the locked approved-logo transition. The loading surface appears for every route, introduces the real header mark, resets retained route scroll, stabilises the destination header, and hands that exact clone from a top-left transform origin to the measured navigation-logo box before releasing the first page reveal. Do not add a second loader or start hero motion behind it.

## Image quality and loading

- Inspect the staged asset dimensions and choose the highest-resolution approved image suitable for each rendered slot. Never stretch a thumbnail, preview derivative, logo, or small raster beyond its intrinsic dimensions; reduce the display size, choose a stronger approved asset, or use a designed non-image composition instead.
- Give every raster image explicit intrinsic dimensions or a stable aspect-ratio wrapper. Provide responsive `sizes` and framework-generated or authored `srcset` candidates where the source permits it, and use an object-fit treatment chosen for the subject rather than cropping accidentally.
- Load the above-the-fold/LCP image eagerly with high fetch priority when it is genuinely the primary visual. Lazy-load below-the-fold images, use asynchronous decoding, and avoid loading hidden carousel or duplicate breakpoint imagery up front.
- Preserve useful alternative text from approved evidence. Decorative images use empty alt text; meaningful images must not use filenames or generic filler as alternatives.

## Behaviour boundary

- Use a real `button` for actions and a real link for navigation.
- Prefer native disclosure, form, list, table, heading, and landmark semantics where they meet the requirement.
- Use Base UI for interaction patterns requiring coordinated ARIA, focus management, keyboard navigation, collision positioning, or modal behaviour.
- The generated wrapper around a Base UI primitive owns all classes, tokens, animation, composition, and brand expression.
- Do not mix another headless component system into the site or install packages during a build.

## Type and data boundary

- Use strict TypeScript without `any`.
- Give reusable components explicit props and variants.
- Keep verified content in typed content modules rather than duplicating strings across JSX.
- Keep external-service code behind an adapter boundary named in `BUILD_NOTES.md`; browser components never contain secrets.

## Evidence

Before completion, confirm repeated controls share implementations, route files do not duplicate the header/footer, component variants cover their states, native semantics remain intact, and removing JavaScript does not hide essential content.
