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
finished source, exported files, screenshots, event logs, and quality results privately. It never
deploys the generated site, sends outreach, submits preview forms, or grants a prospect access.
Production runners must be isolated containers with no deployment credentials and no outbound
access except the Codex request path; the local worker is for trusted development only.

The worker needs an isolated runtime with outbound network controls, memory and CPU limits, a read-only filesystem, no production deployment credentials, and access only to the private `siteforge-artifacts` bucket. The URL checks in code are a defense-in-depth layer, not a replacement for network egress policy.
