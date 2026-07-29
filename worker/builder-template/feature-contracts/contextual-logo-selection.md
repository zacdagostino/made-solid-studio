# Contextual logo selection

## Purpose

Use the approved logo family intelligently without recolouring, filtering, or inventing a replacement
mark. The builder receives the available family members in `../input/approved-assets.json`. A family
member has `logoFamilyPrimaryAssetId` equal to the Brand Kit's `primaryLogoAssetId`, plus an optional
`logoAppearance` such as `original`, `black`, `black-accent`, `white`, or `white-accent`.

## Required behaviour

- Choose the logo from the actual surface directly behind it, independently for the header, footer,
  mobile drawer, intro, and any other approved placement.
- On a dark surface, prefer `white-accent` when its accent remains clearly distinguishable; otherwise
  use `white`.
- On a light surface, prefer `original` when every part is legible; otherwise use `black-accent`, then
  `black`.
- On photography, gradients, video, or uncertain/mixed surfaces, place the logo on a stable solid
  protective surface or use the highest-contrast approved monochrome version. Do not guess from the
  page-wide theme.
- Use only a staged, approved family member. Never create a wordmark, apply CSS `filter`, invert an
  image, change its opacity to compensate for poor contrast, or recolour the logo in CSS or SVG.
- Staged files live in `public/assets/` and are referenced by the website as `/assets/<file>`.
- Keep the logo's intrinsic aspect ratio and give it an accessible text alternative using the
  organisation name from the manifest.
- Mark each logo image with `data-siteforge-logo-context="light"` or
  `data-siteforge-logo-context="dark"` and with the exact staged `logoAppearance` in
  `data-siteforge-logo-appearance`. Use `source` only when the primary source asset itself is used.
- The real header logo image or its immediate wrapper must still carry
  `data-siteforge-brand-logo` for the built-in introduction.

## Contrast decisions

The context annotation describes the stable surface behind the visible logo, not whether the overall
page uses a light or dark theme. If an accent portion loses contrast, use the corresponding plain
white or black version. When no suitable approved variant exists, change the local surface treatment
to make an available approved logo legible; do not manufacture a new asset.

## Responsive and state coverage

Re-evaluate the logo choice when a responsive layout changes its direct background. The compact
header and open drawer may need different family members. Hover, focus, sticky, transparent, and
scrolled header states must not move the logo onto a surface where it becomes unreadable. Prefer a
stable header surface when one static asset cannot remain legible across states.
