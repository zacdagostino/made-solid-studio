# Semantic content recovery

This contract applies whenever `manifest.json` or `revision-scope.json` contains
`approvedVisualContentGroups`. In a scoped revision, those groups are the
current reviewed content boundary and replace stale or generic substitutes in
the restored design baseline.

## Required group and item coverage

- Treat every approved group whose `sourcePageUrl` matches a selected source page
  as required information for that generated page. Account for every item in the
  group; do not replace it with generic copy or silently omit it.
- Add `data-siteforge-recovered-group-id="<approved group id>"` to the component
  root that accounts for the group. Render every matching group ID exactly once.
- Add `data-siteforge-recovered-content-id="<approved item id>"` to the semantic
  element that accounts for each item. Render every matching item ID exactly
  once.
- `structuredContent` is the source of truth. Preserve its relationships,
  reading order, attribution fields, table headings and cells, list order,
  footnotes, and uncertainty boundaries. Plain text is fallback context.
- `sourcePresentations` records how the captured site displayed the information.
  It is provenance only, never a design instruction.
- The source `assetId` is provenance only. Never render, copy, stage, or reuse an
  image after its information has been approved as recovered semantic content,
  including as decoration or elsewhere on the site. Build only from the reviewed
  structured information.

## Builder design decision

- For each group, decide whether to integrate it into an existing page section
  or create a new composition. Base that decision on the group's semantic role,
  source-page context, surrounding approved content, and the new information
  hierarchy.
- Own the heading, placement, visual hierarchy, layout, component composition,
  responsive behaviour, typography, spacing, colour, and interaction treatment.
  The captured presentation must not decide any of these choices.
- Different semantic roles may be combined only when the resulting composition
  keeps every item understandable and individually traceable.
- Do not recreate an image, screenshot, carousel, slider, or gallery merely
  because it was the captured presentation. If an interactive treatment is
  independently justified, all information must remain available and
  understandable without automatic rotation or JavaScript.
- Create `src/SEMANTIC_DESIGN_DECISIONS.json` whenever selected pages have
  approved groups. This is a concise implementation artifact, not hidden
  reasoning. Use this exact structure:

  ```json
  {
    "schemaVersion": 1,
    "groups": [
      {
        "groupId": "exact approved group id",
        "integration": "merged",
        "contentShape": "the actual item count, information type, length variation, and relationships",
        "brandConnection": "how the approved brand tokens and page visual language shape this composition",
        "visualIntent": "a concrete page-specific visual purpose",
        "hierarchy": "how visitors scan and understand this information",
        "responsiveStrategy": "how the composition deliberately reflows or changes emphasis",
        "signatureDetail": "one brand-specific detail that prevents a generic treatment"
      }
    ]
  }
  ```

  `integration` must be either `merged` or `standalone`. Include exactly one
  decision for every approved group in the selected page scope. Write specific
  design intent, not component names such as “cards” or “carousel”. Name the
  real content shape and a concrete connection to the approved brand; “clean
  cards”, “use brand colours”, and “stack on mobile” are not sufficient.

## Single-pass design discipline

- Complete the design-decision artifact before implementing the recovered
  groups. Use it as the composition plan for the same Codex build; there is no
  second model review or automatic styling pass.
- Let the real content shape drive the component anatomy. Vary emphasis when
  attribution, quote length, table density, list order, or uncertainty changes;
  do not force unlike information into identical repeated boxes.
- Give the composition one purposeful brand-connected signature detail while
  keeping the information itself dominant. A decorative effect with no
  relationship to the approved brand or content does not qualify.
- Specify an actual mobile transformation and a desktop/tablet composition.
  Merely writing “stack on mobile” or shrinking the desktop layout is not a
  responsive strategy.
- Within the same build, compare the implemented HTML and CSS against every
  recorded decision before running the final build. The private worker still
  captures desktop, tablet, and mobile evidence for human review, but does not
  invoke another model.

## Semantic fidelity

- Use the semantic HTML appropriate to each item's `semanticRole` and
  `structuredContent`. The builder quality registry checks structural
  requirements for known roles without prescribing a visual design.
- Preserve available attribution and associations without inventing a person's
  name, organisation, job title, rating, date, relationship, or claim.
- For testimonials, render `testimonial.role` and `testimonial.organisation` as
  attribution separate from `testimonial.quote`. Do not visually merge an
  available role or organisation into the quotation text.
- Do not expose internal uncertainty notes as confident visitor-facing claims.
  Preserve uncertain values conservatively and leave unresolved information out
  when it cannot be represented without guessing.

## Responsive and accessibility checks

- Check every recovered-content composition at 375 × 812, 768 × 1024, and
  1440 × 900.
- Ensure long quotes and organisations wrap without horizontal page overflow.
- Keep readable line lengths, visible focus states for any links, WCAG 2.2 AA
  contrast, and a logical heading order.
- Recovered information remains visible when motion is reduced or JavaScript is
  unavailable.
