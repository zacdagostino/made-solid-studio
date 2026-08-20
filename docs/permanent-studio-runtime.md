# Permanent Made Solid Studio runtime

Codex Cloud solves background repository work, but it does not host Made Solid Studio and it does
not expose a subscription-backed API for the embedded chat. An always-available Studio therefore
has two distinct runtime layers.

## Already portable

- The Studio web application can be built as a Vite production site.
- Durable prospect, capture, audit, build, report, and usage state lives in Supabase.
- The Made Solid website already accepts a permanent Studio origin through
  `MADE_SOLID_STUDIO_ORIGIN`.
- Codex Workspace Agent, Website Builder, and Test Builder now require ChatGPT authentication and
  cannot fall back to an API key.

## Selected runtime

Railway Pro in Singapore is the permanent runtime. The repository now includes:

- a production Docker image with Codex CLI, Chromium, GitHub CLI, the Studio build, workers, and
  private preview services;
- a Railway health check and single Singapore replica configuration;
- Supabase-session authorization for every filesystem, Codex, capture, and local workspace route;
- a `/data` persistence contract for the ChatGPT Codex login, editable Studio and website clones,
  generated prospect workspaces, queued visual chat attachments, and active-preview state;
- expiring capability links and an HTTP-only cookie for the separate editable website preview
  domain;
- process supervision that restarts failed workers and lets the web application stay available
  while the first ChatGPT device login is pending.

The Codex App Server listens only on loopback. OpenAI API credentials are removed from the runtime
processes and separately billed analysis workers remain disabled. Railway hosts the application;
it does not replace or alter ChatGPT subscription billing.

See [Railway deployment](railway-deployment.md) for the one-time project, volume, domains, secrets,
and ChatGPT device-login steps.
