# Made Solid Local Website Refinement

This repository is an editable local handoff from a private Made Solid Studio build. Read
`.made-solid/origin.json` and `.made-solid/README.md` before changing the website.

## Working contract

- The checked-in Codespace setup may install Codex and start the site automatically. Never place
  an API key, access token, cached login, or other credential in this repository; use a Codespaces
  secret or Codex's supported browser sign-in.
- Treat the first Git commit as the immutable generated baseline. Never rewrite or squash it.
- Make website changes in this repository first. Do not edit the Made Solid Studio repository or
  its production agent package during ordinary website refinement.
- Preserve factual boundaries and approved local assets. Do not invent business claims, services,
  qualifications, reviews, prices, guarantees, contact details, or integrations.
- Keep the existing component system and semantic design tokens coherent. Fix a repeated problem
  in the shared component or token layer when that is its real cause.
- Verify affected behaviour at 320×568, 375×812, 768×1024, and 1440×900. Run the repository's
  formatter, lint, type check, tests, and production build before handoff.

## Refinement ledger

Record every meaningful correction with `npm run made-solid:log -- ...` after the fix has been
verified. Combine iterative nudges that solve one underlying problem into one entry. Do not create
an entry for formatting-only changes or mechanical renames.

Classify the lesson honestly:

- `strict_invariant`: objectively broken behaviour that should be prevented or block quality
  review, such as missing routes, overlap, overflow, inaccessible controls, or failed images.
- `flexible_principle`: a reusable design or implementation lesson that should guide the agent
  without prescribing one composition.
- `project_specific`: a client-specific content, taste, or delivery decision that should not alter
  future agent behaviour.
- `unclassified`: evidence is not yet sufficient to decide.

Use the same `pattern` value for repeated instances of one root cause. The ledger is the durable
source of truth; conversation history is not.

At a reviewed milestone run `npm run made-solid:bundle`. This creates
`.made-solid/learning-bundle.json` for a separate distillation session in the Made Solid Studio
repository. Never modify that repository or promote an agent package unless the user explicitly
starts the distillation step.
