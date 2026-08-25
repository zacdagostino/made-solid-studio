# Railway deployment for Made Solid Studio

Railway runs one volume-backed Made Solid Studio service in Singapore. The existing Made Solid
website and Clientspace remain on Vercel, and Supabase remains the database, authentication, and
artifact store.

## Runtime topology

One Railway service exposes three HTTPS domains mapped to separate target ports. The public Studio
serves the immutable build from the reviewed Railway image. Workspace serves the same Studio UI
from the persistent editable checkout through Vite HMR, behind a short-lived owner exchange and an
HttpOnly session cookie:

| Domain purpose                           | Suggested hostname            |     Target port |
| ---------------------------------------- | ----------------------------- | --------------: |
| Authenticated Studio                     | `studio.madesolid.com.au`     | `8080` (`PORT`) |
| Private completed and live client frames | `preview.madesolid.com.au`    |          `8787` |
| Owner-authenticated development Studio   | `dev.studio.madesolid.com.au` |          `3000` |

Railway supports multiple domains with different target ports on one service. Keep the Codex App
Server on its loopback-only port `4500`; never add a Railway domain for it.

The editable Studio uses `https://dev.studio.madesolid.com.au/` as its canonical browser URL.
`https://workspace.madesolid.com.au/` remains an accepted compatibility entry during migration. An
unauthenticated document returns through the signed-in production Studio, which verifies the owner
and issues a two-minute, owner-bound exchange. The Workspace gateway removes that exchange from the
URL and replaces it with an eight-hour `HttpOnly`, `Secure`, `SameSite=Strict` session cookie before
proxying HTML, source modules, assets, and HMR WebSockets. Supabase access and refresh tokens never
cross origins in a URL. The internal Vite server listens only on loopback and receives a minimal
allowlisted environment without Railway service credentials. It proxies authenticated runtime API
requests to the single immutable production runtime, so it does not start duplicate workers, Codex
bridges, or maintenance loops.

If Railway replaced the container, the owner-authenticated client-preview access also restarts the
saved client development server from its approved persistent repository before returning.
Recovered source servers run with `NODE_ENV=development` even though the permanent Railway parent
runs in production, keeping Vite and React browser transforms consistent. The live client document
stays in an opaque sandbox and loads from `preview.madesolid.com.au` through a short-lived signed
path. That same exact-client path authenticates rewritten HTML, CSS, JavaScript, images, navigation,
API requests, and HMR without relying on third-party frame cookies or sharing browser storage between
clients. The Preview host removes the capability before proxying to the local development server;
it also removes the opaque frame's browser `Origin` and stale `Sec-Fetch-*` metadata before the trusted loopback hop because Next.js
rejects cross-origin development requests even after the Preview host has authenticated them. On
Railway boot, the runtime validates the persisted active-preview record against approved workspace
roots and existing locked dependencies, rejects reserved ports, and restarts that exact development
server in its persistent tmux session when its recorded port is absent. A failed automatic restore
leaves Studio running so the signed-in owner can use the same authenticated recovery path.
Signed-out, expired, stale-client, and cross-client requests remain unavailable.

## Create the service

1. Create a Railway Pro project and connect `zacdagostino/made-solid-studio` from GitHub.
2. Deploy the reviewed production branch. Railway detects `Dockerfile` and `railway.json`.
3. Attach a volume before first use, mount it at `/data`, and allocate at least 50 GB.
4. Confirm the service is in Singapore. Keep one replica because the editable repositories, Codex
   session, and working previews share the attached volume.
5. Set `PORT=8080`, generate the three domains above, and set each domain's target port explicitly.

A volume-backed Railway service has a short restart window during deployment because two
deployments cannot mount the same volume simultaneously. Supabase-backed jobs and Codex threads
remain durable across that restart.

The image retains the locked dependency installation and reviewed production build. The Studio
domain serves `/app/dist`; it never exposes `/src`, React Refresh, or the Vite HMR client. The
Workspace domain uses the deployed image's trusted Vite configuration with
`/data/workspaces/siteforge-os` as its working root. That keeps a dirty or behind editable checkout
from replacing the gateway/runtime policy while still applying source edits immediately. If the
persistent checkout has no `node_modules`, the launcher links the image's locked installation rather
than installing packages during startup. A Workspace Vite or gateway failure is restarted
independently and cannot stop production Studio, workers, the private Preview host, or Codex.

## Configure variables

Set these in Railway. Never commit their values.

```text
PORT=8080
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SITEFORGE_PREVIEW_ORIGIN=https://preview.madesolid.com.au
VITE_SITEFORGE_DEVELOPMENT_ORIGIN=https://dev.studio.madesolid.com.au
VITE_SITEFORGE_DEVELOPMENT_COMPATIBILITY_ORIGINS=https://workspace.madesolid.com.au
VITE_SITEFORGE_OPENAI_API_ENABLED=false

SITEFORGE_SUPABASE_URL=
SITEFORGE_SUPABASE_SERVICE_ROLE_KEY=
SITEFORGE_RUNTIME_OWNER_USER_ID=
SITEFORGE_RUNTIME_OWNER_ORGANIZATION_ID=
SITEFORGE_PUBLIC_ORIGIN=https://studio.madesolid.com.au
PREVIEW_PUBLIC_ORIGIN=https://preview.madesolid.com.au
# Canonical owner-only development Studio. Keep the legacy variable during staged rollout.
SITEFORGE_DEVELOPMENT_ORIGIN=https://dev.studio.madesolid.com.au
SITEFORGE_DEVELOPMENT_COMPATIBILITY_ORIGINS=https://workspace.madesolid.com.au
SITEFORGE_WORKSPACE_PREVIEW_ORIGIN=https://workspace.madesolid.com.au
MADE_SOLID_WEBSITE_DEVELOPMENT_ORIGIN=https://dev.madesolid.com.au
MADE_SOLID_WEBSITE_PRODUCTION_ORIGIN=https://madesolid.com.au
SITEFORGE_WORKSPACE_PROXY_PORT=3000
SITEFORGE_WORKSPACE_STUDIO_PORT=5173
SITEFORGE_GITHUB_TOKEN=
SITEFORGE_CODEX_AUTH_MODE=runtime
SITEFORGE_OPENAI_API_ENABLED=false
SITEFORGE_CODEX_API_KEY=

MADE_SOLID_HANDOFF_URL=https://madesolid.com.au/api/integrations/studio/handoffs
MADE_SOLID_REPORT_PREVIEW_URL=https://madesolid.com.au/api/integrations/studio/report-previews
MADE_SOLID_HANDOFF_SECRET=
STUDIO_HANDOFF_SECRET=
VERCEL_ACCESS_TOKEN=
VERCEL_TEAM_SLUG=made-solid
CLIENTSPACE_HANDOFF_URL=
CLIENTSPACE_HANDOFF_SECRET=
```

Attach both `dev.studio.madesolid.com.au` and `workspace.madesolid.com.au` to the owner gateway
port during the migration. The canonical hostname receives new access exchanges; the legacy
hostname remains a complete compatibility entry and must not be removed until login, live updates,
embedded website previews, direct hash routes, and notifications have been verified on the new
hostname. Browser sessions, service workers, and Web Push subscriptions are hostname-specific and
are deliberately re-established rather than copied.

`SITEFORGE_GITHUB_TOKEN` should be a fine-grained token restricted to the Made Solid Studio, Made
Solid website, and generated prospect repositories it must edit. Grant repository contents
read/write and only the additional GitHub permissions required by the existing publication flow.
The runtime clones the two main repositories into `/data/workspaces`, fast-forwards clean clones on
restart, and preserves any uncommitted work instead of overwriting it.

Add `SITEFORGE_CODEX_API_KEY` only when you want the authenticated owner to be able to switch all
Studio AI work to separately billed OpenAI API credits. Never add `CODEX_API_KEY` or any API key as
a `VITE_*` variable. ChatGPT subscription access remains the default, and the server passes the key
only to Codex/API worker processes while API credits mode is on.

The `VITE_*` values are build-time variables. Redeploy after adding or changing them.

## Complete the ChatGPT subscription login

After the first healthy deployment, open a trusted Railway shell for the Studio service and run:

```bash
gosu node env CODEX_HOME=/data/codex codex --config 'forced_login_method="chatgpt"' login --device-auth
```

Open the displayed OpenAI device URL, enter its one-time code, and sign in with the ChatGPT account
that owns the Codex subscription. The login cache remains on the `/data` volume. The runtime checks
again automatically within 20 seconds; no API-key fallback exists.

Verify it with:

```bash
gosu node env CODEX_HOME=/data/codex codex --config 'forced_login_method="chatgpt"' login status
```

The result must say `Logged in using ChatGPT`.

## Connect the Made Solid website

Set this production variable for the Vercel website and redeploy it:

```text
MADE_SOLID_STUDIO_ORIGIN=https://studio.madesolid.com.au
```

The website panel then opens the same permanent Studio Workspace Agent; it does not make a second
OpenAI request.

## Final checks

- Open Studio directly and sign in through Supabase. Confirm its HTML references hashed production
  assets and does not load `/@vite/client` or `/src/main.tsx`.
- Open Workspace through the owner exchange. Confirm the clean address stays on Workspace, the full
  Studio UI renders, `/@vite/client` is available only with its owner cookie, and an editable source
  change appears through HMR without changing the production Studio.
- Confirm `/health` returns `200` while every `/__made-solid/*` runtime route rejects a signed-out
  request.
- Start a Codex message, close the browser, return from a phone, and confirm the same thread resumes.
- Run one Agent Studio test and one complete prospect build; confirm both show ChatGPT subscription
  billing mode.
- Open a generated preview and client website editor inside the Workspace Studio. Expire the
  Workspace owner cookie, revisit the clean Workspace URL, and confirm the signed-in owner returns
  automatically to the same path with no capability in the address bar. Redeploy with an active
  client workspace, revisit its exact route, and confirm its development server restarts. Inspect the
  rendered page and browser console rather than relying
  on HTTP `200`; confirm there is visible content and no runtime or failed-resource error. Confirm a
  signed-out or non-owner request remains unavailable.
- Check mobile `375 x 812`, tablet `768 x 1024`, and desktop `1440 x 900`.
- Add Railway usage alerts and a hard spending limit in the project settings.

References: [Railway config as code](https://docs.railway.com/config-as-code/reference),
[target ports](https://docs.railway.com/networking/domains/working-with-domains), and
[volume-backed deployment behavior](https://docs.railway.com/deployments/healthchecks#services-with-attached-volumes).
