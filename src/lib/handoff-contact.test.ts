import { describe, expect, it } from 'vitest';
import type { Contact, EvidenceFact, ResearchPacket } from './domain';
import { capturedPublicEmail, resolveClientHandoffEmail } from './handoff-contact';

function packetWithEmails(emails: unknown[]): ResearchPacket {
  return {
    id: 'packet-1',
    businessId: 'business-1',
    crawlRunId: 'capture-1',
    schemaVersion: 3,
    data: { business: { publicContacts: { emails } } },
    generatedAt: '2026-08-11T12:00:00.000Z',
  };
}

describe('capturedPublicEmail', () => {
  it('uses the first valid public email in captured order', () => {
    expect(
      capturedPublicEmail(
        packetWithEmails(['not-an-email', ' service@example.com ', 'owner@example.com']),
      ),
    ).toBe('service@example.com');
  });

  it('does not invent an email when captured contact evidence is absent', () => {
    expect(capturedPublicEmail(packetWithEmails([]))).toBe('');
    expect(capturedPublicEmail()).toBe('');
  });
});

function contact(email: string, verificationState: Contact['verificationState']): Contact {
  return {
    id: `contact-${email}`,
    businessId: 'business-1',
    email,
    verificationState,
    createdAt: '2026-08-11T12:00:00.000Z',
    updatedAt: '2026-08-11T12:00:00.000Z',
  };
}

function fact(email: string, sourceUrl: string, crawlRunId = 'capture-1'): EvidenceFact {
  return {
    id: `fact-${email}-${sourceUrl}`,
    businessId: 'business-1',
    crawlRunId,
    label: 'Contact email',
    value: email,
    sourceUrl,
    evidence: 'Captured from public page content.',
    confidence: 'high',
    verificationState: 'captured',
    capturedAt: '2026-08-11T12:00:00.000Z',
  };
}

describe('resolveClientHandoffEmail', () => {
  it('prefers a reviewed contact over captured public evidence', () => {
    const selection = resolveClientHandoffEmail({
      contacts: [contact('owner@example.com', 'verified')],
      facts: [fact('info@example.com', 'https://example.com/contact')],
      packet: packetWithEmails(['info@example.com']),
      websiteUrl: 'https://example.com',
    });

    expect(selection).toMatchObject({
      email: 'owner@example.com',
      source: 'reviewed_contact',
      sourceLabel: 'Reviewed prospect contact',
      needsChoice: false,
    });
  });

  it('ranks a general business mailbox on the contact page above weaker captured addresses', () => {
    const selection = resolveClientHandoffEmail({
      facts: [
        fact('director@example.com', 'https://example.com/'),
        fact('info@example.com', 'https://example.com/contact-us'),
      ],
      packet: packetWithEmails(['director@example.com', 'info@example.com']),
      websiteUrl: 'https://example.com',
    });

    expect(selection).toMatchObject({
      email: 'info@example.com',
      source: 'captured_website',
      sourceLabel: 'Contact page',
      sourceUrl: 'https://example.com/contact-us',
    });
  });

  it('requires confirmation when equally strong captured addresses exist', () => {
    const selection = resolveClientHandoffEmail({
      facts: [
        fact('owner@example.com', 'https://example.com/contact'),
        fact('director@example.com', 'https://example.com/contact'),
      ],
      packet: packetWithEmails(['owner@example.com', 'director@example.com']),
      websiteUrl: 'https://example.com',
    });

    expect(selection.email).toBe('owner@example.com');
    expect(selection.needsChoice).toBe(true);
    expect(selection.alternatives.map((candidate) => candidate.email)).toEqual([
      'owner@example.com',
      'director@example.com',
    ]);
  });

  it('ignores rejected contacts, no-reply mailboxes and evidence from an older capture', () => {
    const selection = resolveClientHandoffEmail({
      contacts: [contact('wrong@example.com', 'rejected')],
      facts: [
        fact('old@example.com', 'https://example.com/contact', 'capture-old'),
        fact('noreply@example.com', 'https://example.com/contact'),
      ],
      packet: packetWithEmails(['no-reply@example.com', 'hello@example.com']),
      websiteUrl: 'https://example.com',
    });

    expect(selection.email).toBe('hello@example.com');
    expect(selection.alternatives).toHaveLength(1);
  });

  it('does not use incremental facts before their immutable Research Packet exists', () => {
    const selection = resolveClientHandoffEmail({
      facts: [fact('partial@example.com', 'https://example.com/contact')],
      websiteUrl: 'https://example.com',
    });

    expect(selection.source).toBe('missing');
  });

  it('returns an explicit missing state instead of inventing an address', () => {
    expect(resolveClientHandoffEmail({})).toEqual({
      email: '',
      source: 'missing',
      sourceLabel: 'No public email found',
      alternatives: [],
      needsChoice: false,
    });
  });
});
