# Preview and production runtime profiles

The manifest's `architecture` object selects the production engineering boundary. The private builder always creates a safe static export for review.

## `static-marketing`

Use for content, navigation, local SEO, approved media, and interactions that run entirely in the browser without private data or server mutation. No production backend is required.

## `managed-forms`

Use when approved lead forms, booking handoffs, or third-party integrations can be delivered through a reviewed managed adapter. Build the complete visitor experience and all states. Record the endpoint contract, field validation, retention boundary, spam controls, delivery destination, secrets, failure behaviour, and human configuration in `BUILD_NOTES.md`.

Do not place endpoint secrets or private configuration in browser source. The private preview never submits.

## `managed-next-runtime`

Use when an approved capability needs authentication, accounts, server-side data, transactions, custom workflows, or request-time behaviour. Build the complete visitor-facing preview and a typed adapter boundary. Record the required server routes, data model, authorization, validation, audit, secret, error, and operational boundaries in `BUILD_NOTES.md`.

The private static export is not proof that the backend exists. Production remains blocked until the named managed runtime and human-reviewed configuration are connected.

## Capability discipline

- Implement only entries in `approvedCapabilities`.
- Use `architecture.capabilityAdapters` to distinguish honest preview behaviour from required production services.
- Never invent provider accounts, credentials, submissions, bookings, payments, users, records, or successful integrations.
- Keep integration modules separate from presentational components so a reviewed adapter can replace preview behaviour without redesigning the site.
