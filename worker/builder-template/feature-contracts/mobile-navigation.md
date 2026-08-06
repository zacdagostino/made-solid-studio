# Mobile navigation component contract

Implement this as generated React site components. Base UI Dialog may supply modal focus and dismissal behaviour, but all visual composition belongs to this website.

## Required markup and behaviour

- Compact mode is inclusive through exactly 768 CSS pixels; desktop navigation begins at 769 CSS pixels. Use matching `max-width: 768px` and `min-width: 769px` boundaries rather than substituting 760px, 767px, or a framework default. At compact widths replace the desktop route list with an icon-only trigger at the leading edge of the header.
- Mark the desktop route-list wrapper with `data-siteforge-desktop-navigation`. The locked foundation uses this hook with the trigger hook to guarantee that only the compact control is exposed through 768px and only the desktop navigation is exposed from 769px.
- Render a real `button` with `data-siteforge-menu-trigger`, `aria-expanded="false"` initially, and the accessible name `Open navigation`. While open, change the name to `Close navigation`.
- Never render the words `Menu`, `Navigation`, `Open`, or `Close` inside or beside the trigger. The rendered content is only the generated icon.
- Give the trigger and visible close control at least a 44×44 CSS-pixel target.
- Render the backdrop with `data-siteforge-navigation-backdrop` and the open surface with `data-siteforge-navigation-dialog`. Keep both fixed to the viewport and make the surface at least `100dvh` tall with its own vertical overflow. Treat it as a dialog or deliberate disclosure with a single vertical route hierarchy, the real approved logo, and a clear visible close control marked `data-siteforge-navigation-close`.
- Close on the close control, Escape, backdrop press, and route selection. Route every dismissal path through one shared close function; do not call the state setter directly from Escape or another individual path. Move focus into the surface and restore it to the trigger after dismissal state has committed.
- Animate both opening and closing when motion is allowed. The surface must travel fully from and back toward the trigger edge with opacity support, using a slower smooth decelerating curve and enough duration to read as a deliberate transition rather than a flash. Keep the mounted surface present until its exit transition completes.
- Mark the surface with `data-sf-navigation-motion` and mark its real logo, each primary link, and each secondary action or close control with `data-sf-navigation-item`. The locked runtime sequences those items in DOM/reading order after the surface begins entering and reverses them as it exits. Do not reveal every item at once.
- The locked runtime owns the `is-sf-navigation-open` and `is-sf-navigation-ready` classes. Do not add, remove, or toggle those classes in generated components.
- Animate the trigger icon between its closed and open geometry. Under `prefers-reduced-motion`, the surface, logo, routes, actions, and icon change state immediately without travel or delay.
- Keep desktop navigation visible from 769px. The compact dialog must remain available at 768px and must not leak desktop grid rules into its single-column layout.
- A scroll-responsive header may hide after a deliberate downward scroll and must return on any upward scroll. An open navigation surface always keeps the header visible.
- Declare the compact header logo's actual alignment intent with `data-siteforge-compact-logo-alignment="center"` or `"flow"` on the marked header logo or its wrapper. Flow alignment is valid and must follow the header grid. When `center` is chosen, centre the logo against the viewport itself, independent of unequal trigger and action widths; merely placing it in the middle grid cell is not enough. Do not label an approximately offset logo as centred.
- Put `data-siteforge-intro-surface` on the same `data-siteforge-brand-logo` element or wrapper, with the exact CSS colour used directly behind that approved logo appearance. The locked loading transition uses that value so a light logo cannot be introduced on a light surface or a dark logo on a dark surface.
- On that same marked element, set `data-siteforge-intro-ink` to an exact CSS colour with at least 4.5:1 contrast against the intro surface, and set `data-siteforge-intro-copy` to the short visitor-facing line chosen for this business. Prefer a verified slogan when one is approved; otherwise choose restrained, brand-relevant copy grounded in the available business evidence. The foundation owns no generic loading sentence. Keep the line concise and do not invent a claim.
- Treat the header and compact-navigation logos as immediate interface assets. The header logo image must be eager, high fetch priority, locally served, and intrinsically sized. Mark the drawer logo or its wrapper with `data-siteforge-navigation-logo`. If the drawer uses a different approved appearance or file, preload that exact local source in the initial document and declare it on the marked header logo as `data-siteforge-navigation-logo-src`. Do not wait until the drawer mounts or opens to request its logo.
- Mark the same drawer-logo element with `data-sf-navigation-item` so it participates in the opening sequence before the route links. The locked runtime warms and decodes the declared drawer source during initial hydration, reuses the already-requested header source when both appearances match, and holds the item sequence until the mounted drawer image confirms it is decoded. Do not add independent image visibility rules that can reveal an empty logo box or override this readiness gate.

## Creative ownership

Own the icon geometry, trigger styling, drawer or sheet composition, placement, typography, spacing, surfaces, motion, link hierarchy, and brand treatment. Do not recreate a Made Solid Studio component, use a generic heading, or accept Base UI's examples as the visual design.

Treat the open state as a short composition: surface first, approved logo second, primary routes in sequential reading order, then secondary actions. Use the runtime choreography rather than competing CSS transitions on those marked elements. Pacing should feel calm and responsive—never instant, linear, bouncy, or delayed so long that navigation feels unavailable.

Use the direct header and drawer surfaces to select appropriate approved logo-family members. The open state must feel connected to this site's design system while preserving legibility and focus visibility.

## Required evidence

The protected worker verifies:

- closed layout at 320×568, 375×812, 768×1024, and 1440×900;
- open navigation at 320×568, 375×812, and 768×1024;
- trigger position, accurate accessible name, `aria-expanded`, vertical link stacking, close control, Escape dismissal, focus entry and restoration, route-selection dismissal, overflow, touch targets, and reduced motion.
- motion hooks for the entering/exiting surface, approved logo, sequential primary links, and secondary controls.
- declared flow or geometrically verified viewport-centred compact-logo alignment; a business-specific loading line whose ink has at least 4.5:1 contrast against the declared surface; and immediately decoded header and drawer logo assets on first refresh/open, with the logo first in the drawer item sequence and no route reveal before logo readiness.
