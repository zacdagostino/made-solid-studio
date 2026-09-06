export type CodexConversationTitleSource = {
  name?: string;
  preview?: string;
};

const maximumConversationTitleLength = 60;

export function codexConversationRequestText(value: string | undefined) {
  return (value ?? '')
    .split(/\n\s*(?:Captured from:|During longer work,|<image\b)/i, 1)[0]
    .replace(/\s+/g, ' ')
    .trim();
}

function withoutConversationalLead(value: string) {
  let summary = value;
  const conversationalLead =
    /^(?:(?:ok(?:ay)?|alright|great|sweet|thanks?|thank you|yep|yeah|yes|now|so)[,.!:\s]+)+/i;
  const requestLead =
    /^(?:please\s+|(?:can|could|would|will)\s+(?:we|you)\s+|i(?:'d| would)?\s+(?:like|want|need)\s+(?:you\s+)?to\s+|let(?:'s| us)\s+)/i;

  for (let index = 0; index < 3; index += 1) {
    const next = summary.replace(conversationalLead, '').replace(requestLead, '').trim();
    if (next === summary) break;
    summary = next;
  }
  return summary;
}

function conciseWorkSummary(value: string) {
  if (
    /\b(?:chat name|chat title|each chat(?:'s)? (?:name|title))s?\b/i.test(value) &&
    /\b(?:latest|most recent)\b/i.test(value) &&
    /\b(?:latest|recent) message\b/i.test(value) &&
    /\b(?:pin|pinned|sticky|top)\b/i.test(value)
  ) {
    return 'Update chat titles and pin latest request';
  }
  let summary = withoutConversationalLead(value)
    .replace(/\bevery chat(?:'s|s')? title\b/gi, 'each chat title')
    .replace(/\s+(?:in|inside)\s+the\s+(?:chat\s+)?drop[- ]?down\b/gi, '')
    .replace(/\bconsise\b/gi, 'concise')
    .replace(
      /\bthe latest thing (?:it(?: has|'s) done or is doing|it is doing or has done)\b/gi,
      'its latest work',
    )
    .replace(/\s+(?:so|so that)\s+(?:i|we|you)\s+(?:can|could|will|would)\b[\s\S]*$/i, '')
    .replace(/\s+(?:because|in order to)\b[\s\S]*$/i, '')
    .replace(/^have\s+(.+?)\s+be\s+(.+)$/i, 'Make $1 $2')
    .replace(
      /^Make each chat title a (?:concise )?summary of its latest work$/i,
      "Summarise each chat's latest work",
    )
    .replace(/\bthe complete\b/gi, '')
    .replace(/^why\s+(?:is|are|does|do|did|isn't|aren't|doesn't|don't)\s+/i, 'Investigate ')
    .replace(/^what about\s+/i, 'Review ')
    .replace(/^["'`*_#>\s-]+|["'`*_#>\s.!?,-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!summary) return '';
  summary = `${summary.charAt(0).toUpperCase()}${summary.slice(1)}`;
  if (summary.length <= maximumConversationTitleLength) return summary;

  const candidate = summary.slice(0, maximumConversationTitleLength + 1);
  const wordBoundary = candidate.lastIndexOf(' ');
  return `${candidate.slice(0, wordBoundary >= 34 ? wordBoundary : maximumConversationTitleLength).trimEnd()}…`;
}

export function codexConversationTitle(thread: CodexConversationTitleSource | undefined) {
  const latestPrompt = codexConversationRequestText(thread?.preview)
    .replace(/https?:\/\/\S+/gi, '')
    .trim();
  const source = latestPrompt || thread?.name?.trim() || '';
  return conciseWorkSummary(source) || 'New chat';
}
