import { describe, expect, it } from 'vitest';
import type { ResearchPacket } from './domain';
import { capturedPublicEmail } from './handoff-contact';

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
