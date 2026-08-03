# Private preview host

This isolated HTTP service renders saved `site_file` and `draft_file` artifacts as an actual
website. It keeps the existing expiring capability token, serves the compiled Next.js runtime and
assets with their real MIME types, and never exposes the Supabase service role to browser code.

Deploy the container on a dedicated HTTPS origin, then configure the Studio frontend with:

```text
VITE_SITEFORGE_PREVIEW_ORIGIN=https://preview.example.com
```

Configure the container with:

```text
SUPABASE_URL=https://project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
PREVIEW_PUBLIC_ORIGIN=https://preview.example.com
PORT=8787
```

The origin must remain separate from the Studio application. Preview responses deny framing,
indexing, remote connections, and form submission. A capability URL expires or is revoked through
the existing `builder_preview_access` record.

## GitHub Codespaces development

Create an ignored `.env.preview.local` with the server variables above and use the forwarded port
URL for both `PREVIEW_PUBLIC_ORIGIN` and `VITE_SITEFORGE_PREVIEW_ORIGIN` in `.env.local`. Running
`npm run start:local` then starts Studio, the workers, and this host together. Forward port `8787`
as public so a capability URL can load in a new browser tab; the capability remains the access
control, and GitHub may show its own one-time development-port warning before the first preview.

A Codespace is an appropriate development host, but it is not a durable deployment: previews stop
when the Codespace stops and the forwarding URL changes with the Codespace. Deploy the provided
container to a persistent HTTPS service before relying on previews outside development.
