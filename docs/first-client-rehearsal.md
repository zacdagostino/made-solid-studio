# First client rehearsal

Recorded 10 September 2026. Passing a build or seeing a ready badge is not a completed business rehearsal.

## What the proposal workflow now does

- Website: identifies the committed edit and links to verification. The current handoff worker also requires its matching report; a missing report is explained before submission.
- Client details: uses saved information or captured public contact evidence, preserves manual corrections, saves a private draft and reports save failures. Drafts belong to one prospect. A failed save blocks transfer.
- Offer: one calculator, saved pricing choices, persistent approval, and renewed approval when source, terms or validity change. Advanced pricing is collapsed.
- Handoff: preserves one destination record, supports revised proposals on the same commit, carries an immutable quote history and opens existing Clientspace. A changed email cannot silently reassign an existing account.
- Invitation, actual payments and production launch remain separate deliberate steps.

## Verified production LECE state at inspection

| Item                         | Observed state                                |
| ---------------------------- | --------------------------------------------- |
| Clientspace                  | Already exists; ready for review              |
| Website                      | Handoff records committed edit v2, `51fcf983` |
| Invitation                   | Pending                                       |
| Quote on handoff             | Missing on the earlier handoff                |
| Final balance / payment link | Neither configured                            |
| Payment                      | Not due; no payment plan recorded             |
| Hosting / domain             | Undecided / not started                       |
| Launch                       | Not started                                   |

Production has Microsoft sender configuration, Stripe API/webhook configuration and two hosting price identifiers. Presence is not proof that credentials, permissions, prices, webhook delivery or email deliverability work. Notification code now uses the existing Microsoft sender when no separate Resend provider is configured. No message, payment, subscription or invitation was sent during this implementation.

The live database also contains quote acceptance and milestone tables not represented by the current checkout's payment UI. The current application still starts a payment using a configured project payment URL after website approval. Do not advertise automatic milestone or managed-plan collection until an end-to-end test demonstrates that the accepted choice actually drives checkout and reconciliation. The proposed deposit is never assumed to have been paid.

## Rehearsal in order

Use a clearly named test prospect/project and an inbox you control. Do not reuse LECE's real client identity for the client-role test.

1. **Save and resume.** Enter a test contact, change the project name, adjust and approve a quote. Reload, switch sections and reopen on a phone. Verify all values remain. Change the website version: approval must become a draft. Simulate a save failure: the values remain visible, the error is actionable and transfer stays blocked.
2. **Prepare Clientspace.** Transfer the verified test edit. Check the received website version, email, total, tax and payment schedule against Studio. Retry the same handoff and edit the offer: there must still be one Clientspace, with earlier quote history retained. Test missing report, missing preview and failed verification states.
3. **Test the invitation.** Use the production admin email tool's test-send action to the Studio inbox. Inspect subject, sender, links, mobile layout and replies. This checks the email appearance only: it does not prove a real client's login. Next invite the separate test client inbox, sign in in a private browser and confirm it can access only its own project. Check expired login links and password recovery.
4. **Review as the client.** Open all pages on mobile and desktop, submit feedback, read and reply as staff, resolve it, and approve the intended website version. Check both staff and client notifications arrive. A failed provider request must be visible in operational logs; provider acceptance does not prove inbox delivery.
5. **Rehearse payment in Stripe test mode.** Confirm the agreed offer, tax treatment and amount due. Test success, decline, abandoned checkout, delayed confirmation and duplicate webhook delivery. Compare Clientspace with Stripe: one payment recorded, correct amount and currency, no premature paid state. Test every payment arrangement you intend to offer; hide unsupported options until they work. Never use a live customer payment to test a webhook.
6. **Rehearse hosting and launch.** Choose the intended hosting path. For a managed subscription, test first payment, renewal failure and billing-portal access. Use a test domain/subdomain, confirm ownership/access, DNS, HTTPS and preservation of email records. Test the deployed contact form end to end, redirects, navigation and phone layout. A manually selected Live status is not a deployment test.
7. **Prepare LECE.** Refresh the actual committed version and proposal, confirm the recipient and agreed offer, configure the real payment arrangement, and record hosting/domain requirements. Preview the exact invitation. Send the first client email only when the relevant test journey above has passed and you know how you will fulfil every offered payment/hosting option.

## Operational setup still to demonstrate

- Sending-domain authentication and inbox delivery for invitations and notifications.
- Stripe mode, active Price amounts/currency, signed webhook delivery and correct payment reconciliation.
- The production payment link or the completed quote/milestone checkout integration.
- Monitoring for failed handoff jobs, failed emails and failed webhook processing.
- Database backup/recovery and a reproducible website rollback.
- Business-approved offer wording, inclusions, ongoing hosting costs and tax settings.

Development Clientspace deliberately blocks outbound mail, account mutations and billing. A development-page click is therefore not proof of production delivery. Keep live credentials out of a test-payment environment.

## Implementation verification and rollout

- Proposal workflow browser coverage passed at 375 × 812, 768 × 1024 and 1440 × 900, including saved email, approved quote after reload, failed-save recovery, a missing-report blocker and accessibility/overflow checks.
- Clientspace's missing-quote and received-quote states were browser-reviewed at all three sizes. The proposal sections had no automated WCAG A/AA violations or horizontal page overflow.
- Pricing/contact unit tests passed (14 tests). Clientspace pricing, source handoff, development safety and authentication tests passed (15 tests); two isolated notification tests also passed without sending email.
- Both applications passed TypeScript and production builds. The Clientspace build needed a reduced process/thread budget after the shared runtime exhausted available threads. Relevant ESLint and Prettier checks passed.
- A broader Studio browser run was not wholly green: unrelated Builder architecture/tax-screen tests timed out under resource pressure and an existing completed-build screenshot differed. Do not interpret the focused handoff checks as a full-app certification.
- The proposal draft/refresh migrations are installed in connected Studio; the quote-history migration is installed in development and production Clientspace. Package 25.2 exists once and remains test-ready, not promoted to production.
- Application changes remain in the shared editable checkouts. Production application promotion has not been performed. Clientspace's development and production branches differ substantially, including existing handoff verification code; do not deploy the entire dirty development checkout as a shortcut. Release the reviewed changes through the normal pipeline, verify the received quote on a test handoff, then begin the rehearsal above.
