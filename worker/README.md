# Protected Workers

These are separate, server-only processes. The capture worker claims website-capture jobs, validates public targets, respects applicable `robots.txt` rules, discovers crawlable internal pages, captures responsive screenshots, stores private artifacts, extracts source evidence, and runs automated accessibility checks. The audit worker reads only those saved private artifacts and produces editable, evidence-linked findings. The asset-analysis worker sends each captured public image and its saved page context to a vision model, then saves private, editable suggestions for human review. The visual-content worker reuses those saved private images to recover tables, testimonials, lists, FAQs, and other semantic information without recapturing the website. It also collects deterministic, reviewable brand-colour evidence from SVG logo fills/strokes, logo-image pixels, CSS variables, and repeated rendered interface controls. The agent-package worker turns a refinement direction into a reviewable draft package derived from the published package; it cannot silently change the shared runtime or publish a package. The builder worker runs Codex in a disposable workspace to create a private website preview from an approved Build Manifest.

## Runtime

Use Node.js 22 or later. The worker relies on the native WebSocket implementation required by the Supabase client.

Install the protected generated-site foundation separately from the Studio application:

```bash
npm run setup:builder
```

The foundation uses exact dependency versions and its own lockfile. Worker images must run this
step before accepting build jobs; generated sites cannot install or change packages.

## Capture scope

Each run discovers public, crawlable same-origin HTML pages breadth-first, beginning at the homepage.
It captures up to 100 pages by default, never submits forms, and does not attempt to access
authenticated content. Set `SITEFORGE_CAPTURE_MAX_PAGES` between `1` and `250` to change the
bounded page limit.

Pages are saved incrementally: each completed page publishes its page record, three responsive
screenshots, source artifacts, and direct observations before the worker continues. The workspace
shows the current capture phase and URL, then reveals that new private evidence immediately. A
workspace cancellation request is cooperative: the worker finishes its current safe step, avoids
starting another page or asset, and leaves any already saved evidence private and clearly partial.

## Required environment

Set these only in the worker runtime or Codespaces secret store. Do not put either value in `.env.local`, any `VITE_` variable, browser code, or a committed file.

```bash
SITEFORGE_SUPABASE_URL=https://your-project.supabase.co
SITEFORGE_SUPABASE_SERVICE_ROLE_KEY=your-server-only-key
OPENAI_API_KEY=your-server-only-openai-key
# Optional dedicated key for Codex build jobs. OPENAI_API_KEY is used when this is absent.
SITEFORGE_CODEX_API_KEY=your-server-only-openai-key
```

Optional runtime settings:

```bash
SITEFORGE_WORKER_ID=siteforge-capture-1
SITEFORGE_CAPTURE_POLL_MS=5000
SITEFORGE_ASSET_VISION_MODEL=gpt-5
SITEFORGE_CODEX_MODEL=gpt-5.6
SITEFORGE_CODEX_REASONING_EFFORT=high
SITEFORGE_CODEX_BIN=codex
SITEFORGE_AGENT_PACKAGE_MODEL=gpt-5.6
# Optional rate card for the in-app AI usage page. Values are USD per 1M tokens.
# It overrides the published standard gpt-5.6 Codex test-builder rate.
SITEFORGE_AI_PRICING_JSON='{"gpt-5.6":{"inputPerMillion":5,"cachedInputPerMillion":0.5,"outputPerMillion":30}}'
```

The worker always records provider token usage. It automatically prices the standard `gpt-5.6`
Codex test-builder alias at the published OpenAI standard rate current on 2026-07-24. Configure a
reviewed rate card for any other model, non-standard processing tier, subscription, or invoice
adjustment so the in-app total never treats an unknown amount as a real cost.

Without overrides, private homepage and page-set tests use GPT-5.6 Terra at medium reasoning;
whole-site revisions and complete builds retain GPT-5.6 Sol at high reasoning. Every named profile
stores its official token-credit estimate in the usage record metadata. Override both settings only
when a deployment has reviewed the quality and usage tradeoff.

Package v7.4 treats short workspace directions as outcome-level creative briefs. The builder
independently develops page-specific art direction, typography, responsive composition, and custom
React/CSS motion or interaction instead of requiring the tester to enumerate individual effects.

## Run

For normal local use, run this once instead of starting a worker for every job. It starts the web
app plus the capture, audit, and asset-analysis workers together:

```bash
npm run start:local
```

Keep that terminal open while you work. Every eligible job you create in the app is then claimed
automatically. Press `Ctrl + C` once to stop the app and all workers together.

To run only the background workers without the web app:

```bash
npm run workers
```

Process one queued capture and exit:

```bash
npm run worker:capture -- --once
```

Run continuously:

```bash
npm run worker:capture
```

Process one queued audit after clicking **Generate audit** in the app:

```bash
npm run worker:audit -- --once
```

Run the audit worker continuously:

```bash
npm run worker:audit
```

Process one queued visual-asset analysis after clicking **Analyse assets** in the app:

```bash
npm run worker:assets -- --once
```

Run the visual-asset worker continuously:

```bash
npm run worker:assets
```

Process one queued structured visual-content recovery:

```bash
npm run worker:visual-content -- --once
```

Run structured visual-content recovery continuously:

```bash
npm run worker:visual-content
```

Process one queued private website build:

```bash
npm run worker:builder -- --once
```

## Client preview publishing

After a complete full-site build reaches `ready` with every quality check
passed, the prospect workspace can queue a separate **Publish for client
review** job. The protected publishing worker uploads the saved static export
to a dedicated Vercel project, optionally assigns a Made Solid preview
subdomain, injects Clientspace's own capture bridge, adds no-index and
frame restrictions, and submits a pending handoff to Clientspace admin. It
never sends the client email.

Configure these values only in the protected worker runtime:

```bash
VERCEL_ACCESS_TOKEN=...
# Optional when deploying into a Vercel team
VERCEL_TEAM_ID=team_...
# Optional after preview.madesolid.com.au is configured for aliases in Vercel
VERCEL_PREVIEW_DOMAIN=preview.madesolid.com.au
CLIENTSPACE_PUBLIC_ORIGIN=https://madesolid.com.au
CLIENTSPACE_HANDOFF_URL=https://madesolid.com.au/api/integrations/studio/handoffs
CLIENTSPACE_HANDOFF_SECRET=the-same-long-random-secret-as-clientspace
```

Run the publisher independently with `npm run worker:publish`, or let the
worker supervisor include it automatically when the required Vercel and
Clientspace values exist. Apply
`supabase/migrations/20260806160000_client_preview_publication.sql` first.

## Private GitHub development repositories

Apply `supabase/migrations/20260807160000_github_workspace_publication.sql`, then provide the
protected worker with a GitHub token. The token is never sent to the Studio browser.

Prefer a fine-grained personal access token owned by the target account or organization, with
repository access that includes newly created repositories plus **Administration: write** and
**Contents: write**. An organization may require an owner to approve the token before it can create
or push a private repository. A classic token requires the broader `repo` scope.

```bash
GITHUB_TOKEN=github-token-with-private-repository-access
GITHUB_ALLOWED_OWNERS=your-account,approved-organization
```

`GITHUB_ALLOWED_OWNERS` is optional but recommended. When present, Studio can publish only to the
listed personal accounts or organizations. The worker always creates a private repository and
pushes the complete local-development workspace to its `main` branch. Start it directly with
`npm run worker:github`; the worker supervisor starts it automatically whenever `GITHUB_TOKEN` is
available.

Run the private website builder continuously:

```bash
npm run worker:builder
```

Process one queued Agent Studio package proposal and exit:

```bash
npm run worker:agent-package -- --once
```

Asset descriptions are suggestions, not verified facts. The worker instructs the model to describe only what is visible and to treat page context as non-evidentiary. It does not approve an asset, publish anything, contact a business, or assert business ownership, credentials, relationships, projects, locations, or claims. Review and approve each asset in the **Assets** tab before its description can enter a redesign brief.

The audit worker does not crawl the public web or contact a business. It can only analyse a completed capture that was explicitly attached to its queued audit.

The builder worker reads only an approved Build Manifest, a private dossier for every selected
captured page, and human-approved source assets. It copies a pinned Next.js App Router foundation
into a temporary Git workspace and invokes `codex exec --json --sandbox workspace-write`. The
foundation fixes the framework, strict TypeScript, Tailwind, Base UI, Lucide, formatting, linting,
typing, and export mechanics. Codex creates the business-specific tokens, UI primitives, patterns,
sections, navigation, layouts, and pages rather than selecting a pre-themed component library.

Each manifest assigns every selected source page a clean public route, exact App Router source file,
static-export output file, and source-provenance marker. It also selects a production runtime
profile: static marketing, managed forms, or managed Next.js. Private previews always remain
honest static exports; capabilities that need services, secrets, accounts, payments, or persistent
data receive a typed production-adapter handoff instead of fabricated live behaviour.

The worker runs formatting, lint, strict typing, production compilation, route coverage,
source-provenance, local-asset, browser-console, keyboard/focus, mobile-navigation, horizontal
overflow, touch-target, axe, and responsive checks. Evidence is captured at 320×568, 375×812,
768×1024, and 1440×900, including the open compact-navigation state. Source checkpoints are saved
separately from compiled working drafts; a draft becomes viewable only after `out/index.html`
replaces the starter.

Codex may improve and condense captured copy, but must retain material services, operations,
actions, forms/tools, legal content, and resources without strengthening claims. The worker saves
finished source, exported files, event logs, and quality results privately. Responsive browser
checks run at the required viewports without generating or storing final screenshots. It never
deploys the generated site, sends outreach, submits preview forms, or grants a prospect access.
Production runners must be isolated containers with no deployment credentials and no outbound
access except the Codex request path; the local worker is for trusted development only.

Completed output is viewed through the separate `preview-host` service. That service validates the
existing expiring preview capability, serves the saved export from its own origin with the compiled
Next.js runtime intact, and denies form submission, remote connections, framing, and indexing.
`VITE_SITEFORGE_PREVIEW_ORIGIN` points Studio at that visitor-style host. When it is not configured,
Studio retains the Supabase `srcDoc` viewer as a compatibility fallback.

The worker needs an isolated runtime with outbound network controls, memory and CPU limits, a read-only filesystem, no production deployment credentials, and access only to the private `siteforge-artifacts` bucket. The URL checks in code are a defense-in-depth layer, not a replacement for network egress policy.

## Local website refinement handoff

New completed builds save a **Local development workspace** archive. It contains the editable
source, approved local assets, Studio origin metadata, local-agent instructions, an append-only
refinement ledger, and a private learning-bundle generator. Local corrections never modify the
Studio production agent automatically; they return through a separate reviewed distillation step.

Historic completed builds can be reconstructed from immutable final-source and compiled asset
artifacts without another website generation pass:

```bash
npm run export:local-build -- \
  --run latest \
  --destination ../made-solid-projects/example-site
```

Pass a specific builder run UUID instead of `latest` when required. The destination must be new or
empty. The exporter creates a generated baseline Git commit, installs the refinement workflow in a
second commit, and makes no change to the original Studio build.
