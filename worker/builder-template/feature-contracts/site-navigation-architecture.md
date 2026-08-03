# Multi-page route and navigation architecture

Use this contract whenever the selected source plan contains more than one route.

## Required route behaviour

- Treat every `publicPath` as a real visitor destination, every `sourcePath` as its required App Router implementation, and every `outputPath` as its required static-export evidence.
- Use Next.js `Link` or semantic links with exact clean `publicPath` values. Do not link to source-site URLs, flattened legacy HTML filenames, or a homepage fragment when a selected route exists.
- Keep a concise set of primary destinations consistent in the header on every route.
- When more than one route is generated, the primary header must be page-based: include Home and real generated top-level page destinations. Do not replace those destinations with `#section` shortcuts into the homepage.
- Homepage section links may appear contextually inside homepage content, but they are not primary site navigation when real pages exist.
- Group deeper routes beneath meaningful parents using landing pages, subnavigation, breadcrumbs, route indexes, contextual links, footer groups, or accessible nested navigation.
- Every selected route must be reachable from `/`. Do not satisfy reachability by listing every page in the primary header.
- Keep parent landing pages reachable when a primary item also exposes children.
- Indicate the current page or branch semantically without relying on colour alone.

## Meaningful visitor-facing names

- Give every generated route a concise, meaningful page name derived from its approved dossier, material heading, service, operation, resource, or visitor task.
- Use that name consistently in metadata titles, the single H1, primary or nested navigation, breadcrumbs, route cards, and contextual links where the route appears.
- Never expose capture or CMS placeholders such as `Blank`, `Unnamed`, `Unnamed page`, `Untitled`, `New page`, `Placeholder`, or a raw path such as `/blank` as visitor-facing page or link text.
- A weak source title is not a factual claim and does not need to be preserved verbatim. Rename it from supported page content without inventing a service, location, qualification, or promise.
- Keep the assigned `publicPath`, `sourcePath`, `outputPath`, and source-provenance marker unchanged. This naming rule improves what visitors read; it does not remap immutable build evidence.

## Responsive hierarchy

- Compact navigation preserves the same information architecture and clean paths as desktop.
- Child routes use an accessible nested list or disclosure and remain keyboard reachable.
- Large groups belong in their landing page or local navigation rather than an unmanageably long global drawer.

## Feature-only revisions

For a feature-only whole-site revision, preserve the restored routes, content, design tokens, approved assets, and unrelated interactions. Change only the requested navigation feature and its minimum supporting source.

## Evidence

- Verify each internal link resolves to a static-export route.
- Follow the graph from `/` and confirm every selected route is reachable.
- Compare primary destinations across all generated headers.
- Confirm every multi-page header links to at least one non-home generated route and contains no fragment-only primary destinations.
- Confirm page metadata, H1s, breadcrumbs, cards, and internal navigation use meaningful names rather than placeholders or raw paths.
- Test parent and child routes with keyboard, pointer, touch, active state, focus visibility, disclosures, Escape dismissal, and reduced motion.
