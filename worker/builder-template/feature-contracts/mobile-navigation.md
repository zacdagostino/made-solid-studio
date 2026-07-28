# Mobile navigation feature contract

Implement this feature in the generated page's own local HTML, CSS, and JavaScript. It is not supplied by `main.js`.

## Required behaviour

- At mobile and tablet widths, replace the visible desktop route list with a clearly labelled menu trigger at the leading edge of the header.
- The trigger must communicate `aria-expanded`, have a 44px minimum touch target, and animate between its closed and open states when motion is allowed.
- Open an accessible dialog or disclosure from the same side as the trigger. It must include the real approved logo, a visible close control, and one vertical route list.
- When motion is allowed, animate the drawer entrance and reveal route links in a clear, restrained sequence: the first link begins first, then each following link enters after it. Use a visible opacity and position/scale transition rather than only changing colour. Disable this choreography under `prefers-reduced-motion` while leaving every link immediately visible.
- Close on the close control, Escape, backdrop press where a backdrop exists, and route selection. Move focus into the open menu and return focus to the trigger when it closes.
- Keep desktop navigation visible at desktop widths. Respect `prefers-reduced-motion`; no essential content or control may depend on animation.
- On motion-enabled visits, hide the header after a deliberate downward scroll and reveal it on any upward scroll. Opening the menu must leave the header visible; closing it must not disable future scroll behaviour.

## Creative ownership

Choose the menu-control form, icon choreography, drawer composition, link entrance sequence, typography, spacing, surfaces, and brand-colour treatment for this specific business and page. The result must feel designed for this site, not like a browser-default or repeated SiteForge component.

Create a coherent, accessible colour relationship across the header, drawer, controls, links, and approved brand assets. Choose surfaces and accents from the page's established visual system, then check that the open drawer feels intentional, legible, and visually connected to the rest of the page. Do not use colour combinations that make important brand assets, controls, or navigation labels difficult to distinguish.

You may use local CSS and JavaScript freely, but no dependencies, remote scripts, duplicate navigation models, generic `Navigation` heading, or unstyled text buttons.

## Evidence before completion

Check closed and open states at 320x568 and 375x812, plus tablet and desktop. In the open mobile screenshot, inspect overall colour coherence, contrast, and the relationship between the drawer and header. Confirm no horizontal overflow, keyboard operation, focus restoration, Escape dismissal, visible focus, and a reduced-motion fallback.
