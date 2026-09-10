import type { Contact, EvidenceFact, ResearchPacket } from './domain';

export type HandoffEmailCandidate = {
  email: string;
  source: 'reviewed_contact' | 'saved_contact' | 'captured_website';
  sourceLabel: string;
  sourceUrl?: string;
  score: number;
};

export type HandoffEmailSelection = {
  email: string;
  source: HandoffEmailCandidate['source'] | 'missing';
  sourceLabel: string;
  sourceUrl?: string;
  alternatives: HandoffEmailCandidate[];
  needsChoice: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const rejectedMailboxPattern = /^(?:no-?reply|do-?not-?reply|mailer-daemon|postmaster)$/i;
const preferredMailboxPattern =
  /^(?:contact|enquir(?:y|ies)|hello|info|office|admin|sales|support|bookings?|service)$/i;

function normaliseEmail(value: unknown) {
  if (typeof value !== 'string') return '';
  const email =
    value
      .trim()
      .replace(/^mailto:/i, '')
      .split('?')[0]
      ?.toLowerCase() ?? '';
  if (!emailPattern.test(email)) return '';
  return rejectedMailboxPattern.test(email.split('@')[0] ?? '') ? '' : email;
}

function packetEmails(packet?: ResearchPacket) {
  const business = packet?.data.business;
  if (!business || typeof business !== 'object') return [];
  const publicContacts = (business as Record<string, unknown>).publicContacts;
  if (!publicContacts || typeof publicContacts !== 'object') return [];
  const emails = (publicContacts as Record<string, unknown>).emails;
  return Array.isArray(emails) ? emails.map(normaliseEmail).filter(Boolean) : [];
}

function pageSource(url?: string) {
  if (!url) return { label: 'Captured public website', score: 0 };
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (/contact|enquir/.test(pathname)) return { label: 'Contact page', score: 80 };
    if (/quote|book/.test(pathname)) return { label: 'Quote or booking page', score: 60 };
    if (/about|team/.test(pathname)) return { label: 'About page', score: 40 };
    if (pathname === '/' || pathname === '') return { label: 'Homepage', score: 30 };
  } catch {
    return { label: 'Captured public website', score: 0 };
  }
  return { label: 'Public website page', score: 10 };
}

function mailboxScore(email: string) {
  return preferredMailboxPattern.test(email.split('@')[0] ?? '') ? 30 : 0;
}

function firstPartySource(sourceUrl: string | undefined, websiteUrl: string | undefined) {
  if (!sourceUrl || !websiteUrl) return sourceUrl;
  try {
    const sourceHost = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, '');
    const websiteHost = new URL(websiteUrl).hostname.toLowerCase().replace(/^www\./, '');
    const sameSite =
      sourceHost === websiteHost ||
      sourceHost.endsWith(`.${websiteHost}`) ||
      websiteHost.endsWith(`.${sourceHost}`);
    return sameSite ? sourceUrl : undefined;
  } catch {
    return undefined;
  }
}

function addCandidate(
  candidates: Map<string, HandoffEmailCandidate>,
  candidate: HandoffEmailCandidate,
) {
  const existing = candidates.get(candidate.email);
  if (!existing || candidate.score > existing.score) candidates.set(candidate.email, candidate);
}

export function resolveClientHandoffEmail({
  contacts = [],
  facts = [],
  packet,
  websiteUrl,
}: {
  contacts?: Contact[];
  facts?: EvidenceFact[];
  packet?: ResearchPacket;
  websiteUrl?: string;
}): HandoffEmailSelection {
  const candidates = new Map<string, HandoffEmailCandidate>();

  contacts.forEach((contact, index) => {
    if (contact.verificationState === 'rejected') return;
    const email = normaliseEmail(contact.email);
    if (!email) return;
    const reviewed = contact.verificationState === 'verified';
    addCandidate(candidates, {
      email,
      source: reviewed ? 'reviewed_contact' : 'saved_contact',
      sourceLabel: reviewed ? 'Reviewed prospect contact' : 'Saved prospect contact',
      score: (reviewed ? 2_000 : 1_800) - index,
    });
  });

  facts.forEach((fact, index) => {
    if (
      !packet ||
      fact.label.toLowerCase() !== 'contact email' ||
      fact.verificationState === 'rejected' ||
      fact.crawlRunId !== packet.crawlRunId
    ) {
      return;
    }
    const email = normaliseEmail(fact.value);
    if (!email) return;
    const sourceUrl = firstPartySource(fact.sourceUrl, websiteUrl);
    const source = pageSource(sourceUrl);
    const confidenceScore = fact.confidence === 'high' ? 30 : fact.confidence === 'medium' ? 15 : 0;
    addCandidate(candidates, {
      email,
      source: 'captured_website',
      sourceLabel: source.label,
      sourceUrl,
      score: 1_000 + source.score + confidenceScore + mailboxScore(email) - index / 1_000,
    });
  });

  packetEmails(packet).forEach((email) => {
    addCandidate(candidates, {
      email,
      source: 'captured_website',
      sourceLabel: 'Captured Research Packet',
      score: 800 + mailboxScore(email),
    });
  });

  const ordered = [...candidates.values()].sort((left, right) => right.score - left.score);
  const selected = ordered[0];
  if (!selected) {
    return {
      email: '',
      source: 'missing',
      sourceLabel: 'No public email found',
      alternatives: [],
      needsChoice: false,
    };
  }

  const runnerUp = ordered[1];
  const needsChoice = Boolean(
    runnerUp &&
    selected.source === 'captured_website' &&
    runnerUp.source === 'captured_website' &&
    Math.abs(selected.score - runnerUp.score) < 1,
  );
  return {
    email: selected.email,
    source: selected.source,
    sourceLabel: selected.sourceLabel,
    sourceUrl: selected.sourceUrl,
    alternatives: ordered,
    needsChoice,
  };
}

export function capturedPublicEmail(packet?: ResearchPacket) {
  return resolveClientHandoffEmail({ packet }).email;
}
