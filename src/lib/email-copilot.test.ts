import { describe, expect, it } from 'vitest';
import type { ProspectWorkspace } from './domain';
import {
  createSuggestedReply,
  emailContextSnapshot,
  reviseSuggestedReply,
  sampleInboundEmails,
} from './email-copilot';

function workspaceFixture(): ProspectWorkspace {
  return {
    business: {
      id: 'business-1',
      kind: 'prospect',
      name: 'Solid Plumbing',
      stage: 'responded',
      reviewState: 'approved',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-18T00:00:00.000Z',
    },
    website: {
      id: 'website-1',
      businessId: 'business-1',
      url: 'https://solid-plumbing.example',
      domain: 'solid-plumbing.example',
      crawlStatus: 'captured',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-18T00:00:00.000Z',
    },
    contacts: [
      {
        id: 'contact-1',
        businessId: 'business-1',
        name: 'Jordan Lee',
        email: 'jordan@solid-plumbing.example',
        verificationState: 'verified',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-18T00:00:00.000Z',
      },
    ],
    outreachCompliance: {
      id: 'compliance-1',
      businessId: 'business-1',
      consentBasis: 'existing_relationship',
      sourceNote: 'Client replied directly.',
      emailAllowed: true,
      phoneAllowed: false,
      doNotCallClear: false,
      senderIdentificationConfirmed: true,
      unsubscribeProcessConfirmed: true,
      notes: '',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-18T00:00:00.000Z',
    },
    facts: [
      {
        id: 'fact-1',
        businessId: 'business-1',
        label: 'Service area',
        value: 'Melbourne',
        evidence: 'Public website',
        confidence: 'high',
        verificationState: 'verified',
        capturedAt: '2026-08-18T00:00:00.000Z',
      },
    ],
    tasks: [],
  } as unknown as ProspectWorkspace;
}

describe('client email copilot demo', () => {
  it('creates realistic test messages and a grounded review context', () => {
    const workspace = workspaceFixture();
    const emails = sampleInboundEmails(workspace);
    const context = emailContextSnapshot(workspace);

    expect(emails).toHaveLength(3);
    expect(emails.every((email) => email.isTest)).toBe(true);
    expect(context.businessName).toBe('Solid Plumbing');
    expect(context.stage).toBe('Responded');
    expect(context.contact).toContain('Jordan Lee');
    expect(context.researchSummary).toContain('1 captured or verified fact');
    expect(context.outreachState).toContain('human approval still required');
  });

  it('generates a reply that avoids invented pricing and supports prompted revision', () => {
    const workspace = workspaceFixture();
    const pricingEmail = sampleInboundEmails(workspace)[1]!;
    const draft = createSuggestedReply(workspace, pricingEmail);
    const revised = reviseSuggestedReply(draft, 'Make it softer with no pressure');

    expect(draft.body).toContain('confirm the exact scope, price and realistic timing');
    expect(draft.body).toContain('Solid Plumbing');
    expect(revised.body).toContain('There is no pressure to decide now');
    expect(revised.subject).toBe(draft.subject);
  });
});
