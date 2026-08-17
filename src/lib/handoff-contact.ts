import type { ResearchPacket } from './domain';

export function capturedPublicEmail(packet?: ResearchPacket) {
  if (!packet) return '';
  const business = packet.data.business;
  if (typeof business !== 'object' || business === null) return '';
  const publicContacts = (business as Record<string, unknown>).publicContacts;
  if (typeof publicContacts !== 'object' || publicContacts === null) return '';
  const emails = (publicContacts as Record<string, unknown>).emails;
  if (!Array.isArray(emails)) return '';
  return (
    emails
      .find(
        (email): email is string =>
          typeof email === 'string' && /^\S+@\S+\.\S+$/.test(email.trim()),
      )
      ?.trim() ?? ''
  );
}
