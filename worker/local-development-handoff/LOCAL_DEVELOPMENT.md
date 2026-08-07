# Local development handoff

This is the editable source project from a private Made Solid Studio build. Approved visual assets
are included locally so normal development and production builds do not depend on expiring Studio
storage links.

## Start

1. Activate Node 22: `nvm use` (the included `.nvmrc` pins it).
2. Confirm the generated baseline is committed: `git log --oneline --max-count=2`.
3. Install the locked dependencies: `npm ci`.
4. Start the site: `npm run dev`.
5. Read `AGENTS.md` before asking a local coding agent to make changes.

## Record a verified correction

```sh
npm run made-solid:log -- \
  --id MS-001 \
  --classification strict_invariant \
  --title "Keep the hero title clear of media" \
  --problem "The mobile hero image overlapped the heading at 375px." \
  --fix "The shared hero now reserves media space and stacks at compact widths." \
  --paths "src/components/sections/hero.tsx,src/app/globals.css" \
  --viewports "375x812" \
  --verification "Playwright collision assertion and responsive screenshot reviewed" \
  --pattern "hero-media-collision"
```

Use `flexible_principle`, `project_specific`, or `unclassified` when a strict invariant is not
appropriate. Run `npm run made-solid:summary` to review the ledger.

## Prepare the Studio learning handoff

Commit the finished website changes, run the complete verification suite, then run:

```sh
npm run made-solid:bundle
```

Give `.made-solid/learning-bundle.json` and the local repository path to the agent working in the
Made Solid Studio repository. The finished website is reference evidence; the Studio agent must
replay the original immutable manifest without copying this final source when testing a new agent
package.
