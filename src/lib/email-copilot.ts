import { stageLabels, type ProspectWorkspace } from './domain';

export type TestInboundEmail = {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  scenario: 'interest' | 'pricing' | 'changes' | 'custom';
  isTest: true;
};

export type EmailContextSnapshot = {
  businessName: string;
  stage: string;
  website: string;
  contact: string;
  researchSummary: string;
  openTaskSummary: string;
  outreachState: string;
  uncertainty: string;
};

export type SuggestedEmailDraft = {
  subject: string;
  body: string;
};

const sampleReceivedAt = '2026-08-18T08:30:00.000Z';

export function sampleInboundEmails(workspace: ProspectWorkspace): TestInboundEmail[] {
  const contact = workspace.contacts.find((candidate) => candidate.email);
  const fromName = contact?.name || 'Jordan Lee';
  const fromEmail = contact?.email || 'jordan@demo-client.example';
  return [
    {
      id: 'test-interest',
      fromName,
      fromEmail,
      subject: 'Re: the website preview',
      body: `Hi, thanks for sending this through. We like the direction. Could you let me know what the next step is and when you would be available to start?`,
      receivedAt: sampleReceivedAt,
      scenario: 'interest',
      isTest: true,
    },
    {
      id: 'test-pricing',
      fromName: 'Morgan Chen',
      fromEmail: 'morgan@a-very-long-demonstration-client-domain.example',
      subject: 'A question about price and timing',
      body: `The proposal looks promising, but the full option is more than we planned to spend right now. Is there a smaller first stage, and can you confirm the likely timing without locking us into anything?`,
      receivedAt: '2026-08-17T05:15:00.000Z',
      scenario: 'pricing',
      isTest: true,
    },
    {
      id: 'test-changes',
      fromName: 'Casey Nguyen',
      fromEmail: 'casey@demo-client.example',
      subject: 'A couple of changes before we proceed',
      body: `Can the services be easier to find and can we add the new booking option? I am not sure whether you already have the details for that.`,
      receivedAt: '2026-08-16T23:40:00.000Z',
      scenario: 'changes',
      isTest: true,
    },
  ];
}

export function emailContextSnapshot(workspace: ProspectWorkspace): EmailContextSnapshot {
  const contact = workspace.contacts.find((candidate) => candidate.email);
  const verifiedFacts = workspace.facts.filter((fact) =>
    ['verified', 'captured'].includes(fact.verificationState),
  );
  const openTasks = workspace.tasks.filter((task) => task.state === 'open');
  const compliance = workspace.outreachCompliance;
  return {
    businessName: workspace.business.name,
    stage: stageLabels[workspace.business.stage],
    website: workspace.website?.domain || 'No website recorded',
    contact: contact
      ? `${contact.name || contact.email} · ${contact.verificationState.replaceAll('_', ' ')}`
      : 'No matched contact — confirm the sender manually',
    researchSummary: verifiedFacts.length
      ? `${verifiedFacts.length} captured or verified facts available`
      : 'No verified research facts available',
    openTaskSummary: openTasks.length
      ? `${openTasks.length} open internal ${openTasks.length === 1 ? 'task' : 'tasks'}`
      : 'No open internal tasks',
    outreachState: compliance?.suppressedAt
      ? 'Suppressed — review only; outbound sending blocked'
      : compliance?.emailAllowed
        ? 'Email channel reviewed; human approval still required'
        : 'Email permission not recorded; review only',
    uncertainty:
      'Dates, prices and unverified requests are never invented; the draft asks for confirmation.',
  };
}

export function createSuggestedReply(
  workspace: ProspectWorkspace,
  email: TestInboundEmail,
): SuggestedEmailDraft {
  const firstName = email.fromName.trim().split(/\s+/)[0] || 'there';
  const businessName = workspace.business.name;
  const signoff = `\n\nKind regards,\nMade Solid Studio`;
  if (email.scenario === 'pricing' || /price|budget|cost/i.test(email.body)) {
    return {
      subject: `Re: ${email.subject.replace(/^Re:\s*/i, '')}`,
      body: `Hi ${firstName},\n\nThanks for being open about the budget. We can review a focused first stage for ${businessName} without asking you to commit to work you do not need yet. I’ll confirm the exact scope, price and realistic timing with you before anything is agreed.${signoff}`,
    };
  }
  if (email.scenario === 'changes' || /change|add|booking/i.test(email.body)) {
    return {
      subject: `Re: ${email.subject.replace(/^Re:\s*/i, '')}`,
      body: `Hi ${firstName},\n\nYes, I can review those changes for ${businessName}. I have noted the services navigation and the requested booking option. I do not yet have enough verified detail to promise how the booking should work, so could you tell me which booking process or provider you want customers to use?${signoff}`,
    };
  }
  return {
    subject: `Re: ${email.subject.replace(/^Re:\s*/i, '')}`,
    body: `Hi ${firstName},\n\nThanks for getting back to me — I’m glad the direction feels right for ${businessName}. The next step is a short review to confirm the final scope and timing. I’ll verify my next available start date before we agree anything, rather than give you an estimate that may change.${signoff}`,
  };
}

export function reviseSuggestedReply(
  draft: SuggestedEmailDraft,
  instruction: string,
): SuggestedEmailDraft {
  const normalized = instruction.trim().toLowerCase();
  let body = draft.body;
  if (/short|concise|brief/.test(normalized)) {
    const paragraphs = body.split(/\n\n/);
    body = [paragraphs[0], paragraphs[1], paragraphs.at(-1)].filter(Boolean).join('\n\n');
  }
  if (/warm|friendly|personal/.test(normalized)) {
    body = body.replace(/Thanks for (getting back to me|being open)/i, 'Thanks so much for $1');
  }
  if (/clear.*next|next step|call/.test(normalized)) {
    body = body.replace(
      /\n\nKind regards,/,
      '\n\nIf it suits you, reply with a preferred day and I’ll suggest a time for a short call.\n\nKind regards,',
    );
  }
  if (/no pressure|less sales|soft/.test(normalized)) {
    body = body.replace(
      /\n\nKind regards,/,
      '\n\nThere is no pressure to decide now — I’m happy to answer questions first.\n\nKind regards,',
    );
  }
  if (body === draft.body) {
    body = body.replace(
      /\n\nKind regards,/,
      `\n\nI’ve adjusted this draft with your direction in mind: ${instruction.trim()}.\n\nKind regards,`,
    );
  }
  return { ...draft, body };
}
