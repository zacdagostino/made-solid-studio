# Mobile navigation component contract

Implement this as generated React site components. Base UI Dialog may supply modal focus and dismissal behaviour, but all visual composition belongs to this website.

## Required markup and behaviour

- At compact widths replace the desktop route list with an icon-only trigger at the leading edge of the header.
- Render a real `button` with `data-siteforge-menu-trigger`, `aria-expanded="false"` initially, and the accessible name `Open navigation`. While open, change the name to `Close navigation`.
- Never render the words `Menu`, `Navigation`, `Open`, or `Close` inside or beside the trigger. The rendered content is only the generated icon.
- Give the trigger and visible close control at least a 44×44 CSS-pixel target.
- Render the open surface with `data-siteforge-navigation-dialog`. Treat it as a dialog or deliberate disclosure with a single vertical route hierarchy, the real approved logo, and a clear visible close control marked `data-siteforge-navigation-close`.
- Close on the close control, Escape, backdrop press, and route selection. Move focus into the surface and restore it to the trigger on dismissal.
- Animate both opening and closing when motion is allowed. The surface must travel fully from and back toward the trigger edge with opacity support, using a slower smooth decelerating curve and enough duration to read as a deliberate transition rather than a flash. Keep the mounted surface present until its exit transition completes.
- Mark the surface with `data-sf-navigation-motion` and mark its real logo, each primary link, and each secondary action or close control with `data-sf-navigation-item`. The locked runtime sequences those items in DOM/reading order after the surface begins entering and reverses them as it exits. Do not reveal every item at once.
- Animate the trigger icon between its closed and open geometry. Under `prefers-reduced-motion`, the surface, logo, routes, actions, and icon change state immediately without travel or delay.
- Keep desktop navigation visible at desktop width. The compact dialog must not leak tablet/desktop grid rules.
- A scroll-responsive header may hide after a deliberate downward scroll and must return on any upward scroll. An open navigation surface always keeps the header visible.

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
