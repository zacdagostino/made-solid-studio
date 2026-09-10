# Controlled proposal release — 10 September 2026

## Scope

Release the saved Studio proposal and exact-source Clientspace handoff. Do not send invitations, emails, payments or launch LECE's website. Preserve the original dirty development checkouts.

## Durable progress

- Clean Studio worktree: `/data/workspaces/studio-proposal-release`, based on production `4deaf9c`.
- Clean Clientspace worktree: `/data/workspaces/clientspace-proposal-release`, based on production `2633163`.
- Clientspace release commit `9c3ba4c8888f0cd7b1ab8f58adadc3644ade0896` is live. Vercel production deployment `dpl_9MDvdJdo3Zo6U51L7WDTq5bbU8gQ` is READY and aliases include madesolid.com.au. Production login returned 200; handoff endpoint returned 401 unauthenticated and 400 for a deliberately incomplete authenticated source handoff, explicitly requiring pricingSnapshot and releaseAttestation. No data was submitted beyond that invalid payload.
- Exact-source attestation and legacy same-commit verification migrations installed in production `dvitqwblgowhklhwpqqw` and development `nqopqmzbkwdlitspfpmm`. Both recorded in the migration ledger. Existing quote migration remains installed.
- SQL rehearsal against installed production functions passed and rolled back: same quote retry is idempotent, different content cannot overwrite a quote, and an older exact-source revision can receive matching verification. No synthetic handoff remained.
- Studio release is the next push. If this session restarts, inspect the clean worktree's HEAD and origin/main before retrying: do not assume deployment failed because the session stopped.

## Verification

- Both clean release copies passed production builds and relevant lint/format checks.
- Studio: 14 contact/pricing tests, package registration test and six focused responsive/accessibility browser tests passed.
- Clientspace: four pricing/notification tests passed without sending messages.
- Both apps' proposal layouts reviewed at 375 × 812, 768 × 1024 and 1440 × 900. Focused checks found no horizontal overflow or automated accessibility violations.
- Full real-client invitation, payment and launch rehearsal is still outstanding; do not claim business readiness from these checks.

## Resume after deployment restart

1. Check Vercel deployment above reached READY and production points at that commit.
2. Confirm production handoff endpoint rejects unauthenticated requests and malformed authenticated source payloads without saving anything.
3. Commit only scoped Studio source, docs, tests, migrations and regenerated dist. Do not stage tracked node_modules changes.
4. Push the clean Studio release to main and monitor Railway. The runtime may restart this session.
5. Verify new Studio production bundle and health. Update this record and the rehearsal checklist with actual deployment results.

Rollback references: Clientspace deployment `dpl_AghNZDX6sgqwKk3HWNWSPdCbRQcU`; Studio deployment `59eacbfc-8bf8-44fb-a0a3-fc0f30a766a5`, source `4deaf9c`. Database verification gates must remain enforced; rolling back the old API alone will not restore its revoked legacy source RPC.
