# Multi-page route and navigation architecture

Use this contract whenever the selected source plan contains more than one route.

## Required route behaviour

- Treat every `publicPath` as a real visitor destination, every `sourcePath` as its required App Router implementation, and every `outputPath` as its required static-export evidence.
- Use Next.js `Link` or semantic links with exact clean `publicPath` values. Do not link to source-site URLs, flattened legacy HTML filenames, or a homepage fragment when a selected route exists.
- Keep a concise set of primary destinations consistent in the header on every route.
- Group deeper routes beneath meaningful parents using landing pages, subnavigation, breadcrumbs, route indexes, contextual links, footer groups, or accessible nested navigation.
- Every selected route must be reachable from `/`. Do not satisfy reachability by listing every page in the primary header.
- Keep parent landing pages reachable when a primary item also exposes children.
- Indicate the current page or branch semantically without relying on colour alone.

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
- Test parent and child routes with keyboard, pointer, touch, active state, focus visibility, disclosures, Escape dismissal, and reduced motion.
