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
