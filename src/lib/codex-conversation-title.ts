export type CodexConversationTitleSource = {
  compactTitle?: string;
  dropdownTitle?: string;
  name?: string;
  preview?: string;
  previousPreview?: string;
  contextPreviews?: string[];
};

const maximumConversationTitleLength = 48;
const maximumDropdownTitleLength = 96;
type ConversationTitlePresentation = 'compact' | 'dropdown';

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

function mentionsChatTitles(value: string) {
  return (
    /\b(?:chat name|chat title|(?:each|every) chat(?:'s)? (?:name|title))s?\b/i.test(value) ||
    /\bnames? of (?:each|every) chats?\b/i.test(value) ||
    /\bchats?(?:\s+[a-z]+){0,6}\s+titles?\b/i.test(value) ||
    /\btitles?(?:\s+[a-z]+){0,6}\s+chats?\b/i.test(value)
  );
}

function conciseWorkSummary(
  value: string,
  presentation: ConversationTitlePresentation = 'compact',
) {
  const expanded = presentation === 'dropdown';
  if (
    mentionsChatTitles(value) &&
    /\b(?:complete|full|exact) (?:message|prompt)\b/i.test(value) &&
    /\bconcise (?:interpretation|summary)\b/i.test(value)
  ) {
    return expanded
      ? 'Use concise current-task interpretations for chat titles'
      : 'Create contextual chat titles';
  }
  if (
    mentionsChatTitles(value) &&
    /\bcon(?:cise|sise) summary\b/i.test(value) &&
    /\b(?:latest thing|latest work|most recent task)\b/i.test(value) &&
    !(
      /\b(?:running|working|in progress)\b/i.test(value) &&
      /\b(?:complete|completed|finished|done)\b/i.test(value)
    )
  ) {
    return "Summarise each chat's latest work";
  }
  if (
    /\bpreview\b/i.test(value) &&
    /\bwebsite/i.test(value) &&
    /\bdesktop\b/i.test(value) &&
    /\btablet\b/i.test(value) &&
    /\bphone\b/i.test(value)
  ) {
    return 'Preview desktop, tablet, and phone website layouts from a phone';
  }
  if (
    /\bClientspace\b/i.test(value) &&
    /\bnavigation\b/i.test(value) &&
    /\b(?:confusing|unclear)\b/i.test(value) &&
    /\bpage labels?\b/i.test(value)
  ) {
    return expanded
      ? 'Review Clientspace navigation and confusing page labels'
      : 'Review Clientspace navigation';
  }
  if (
    /\b(?:drop[- ]?down|conversation (?:list|menu|chooser))\b/i.test(value) &&
    /\b(?:full|complete|longer|cut off|ellipsis|\.\.\.)\b/i.test(value) &&
    /\b(?:click|clicked|selected|closed|trigger)\b/i.test(value)
  ) {
    return expanded
      ? 'Show complete contextual titles only in the open dropdown'
      : 'Show full titles in the chat dropdown';
  }
  if (
    /\b(?:older|other|previous) chats?\b/i.test(value) &&
    /\b(?:context|worked|working|title|name)s?\b/i.test(value)
  ) {
    return 'Fix context for previous chat titles';
  }
  if (
    mentionsChatTitles(value) &&
    /\b(?:running|working|in progress)\b/i.test(value) &&
    /\b(?:complete|completed|finished|done)\b/i.test(value)
  ) {
    return expanded
      ? 'Use contextual chat titles with distinct running and completed states'
      : 'Improve chat titles and status states';
  }
  if (
    mentionsChatTitles(value) &&
    /\b(?:exact|latest|last|most recent) message\b/i.test(value) &&
    /\b(?:concise interpretation|context|contextual)\b/i.test(value)
  ) {
    return 'Create contextual chat titles';
  }
  if (
    mentionsChatTitles(value) &&
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
    .replace(/^have\s+(.+?)\s+be\s+(.+)$/i, 'Make $1 $2')
    .replace(/^why\s+(?:is|are|does|do|did|isn't|aren't|doesn't|don't)\s+/i, 'Investigate ')
    .replace(/^what about\s+/i, 'Review ')
    .replace(/^["'`*_#>\s-]+|["'`*_#>\s.!?,-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!expanded) {
    summary = summary
      .replace(/\bthe complete\b/gi, '')
      .replace(/\s+(?:so|so that)\s+(?:i|we|you)\s+(?:can|could|will|would)\b[\s\S]*$/i, '')
      .replace(/\s+(?:because|in order to)\b[\s\S]*$/i, '')
      .replace(
        /^Make each chat title a (?:concise )?summary of its latest work$/i,
        "Summarise each chat's latest work",
      )
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (!summary) return '';
  summary = `${summary.charAt(0).toUpperCase()}${summary.slice(1)}`;
  if (expanded) {
    if (summary.length <= maximumDropdownTitleLength) return summary;
    const withoutRationale = summary
      .replace(/\s+(?:so|so that)\s+(?:i|we|you)\s+(?:can|could|will|would)\b[\s\S]*$/i, '')
      .replace(/\s+(?:because|in order to)\b[\s\S]*$/i, '')
      .trim();
    if (withoutRationale.length >= 28 && withoutRationale.length <= maximumDropdownTitleLength) {
      return withoutRationale;
    }
    const sentence = summary
      .match(/^.{28,96}?[.!?](?:\s|$)/)?.[0]
      .replace(/[.!?]+$/, '')
      .trim();
    if (sentence) return sentence;
    const candidate = summary.slice(0, maximumDropdownTitleLength + 1);
    const wordBoundary = candidate.lastIndexOf(' ');
    return candidate
      .slice(0, wordBoundary >= 48 ? wordBoundary : maximumDropdownTitleLength)
      .replace(/\s+(?:and|or|with|for|to)$/i, '')
      .trimEnd();
  }
  if (summary.length <= maximumConversationTitleLength) return summary;

  const candidate = summary.slice(0, maximumConversationTitleLength + 1);
  const wordBoundary = candidate.lastIndexOf(' ');
  const ending = candidate
    .slice(0, wordBoundary >= 28 ? wordBoundary : maximumConversationTitleLength)
    .trimEnd();
  return `${ending.replace(/\s+(?:and|or|with|for|to)$/i, '')}…`;
}

function vagueFollowupAction(value: string) {
  if (/\bCodespace paused\b/i.test(value) && /\bcontinue the same request\b/i.test(value)) {
    return 'Continue';
  }
  const followup = withoutConversationalLead(value)
    .replace(/[.!?]+$/g, '')
    .trim()
    .toLowerCase()
    .replace(/^donit$/, 'do it');
  if (!followup) return undefined;
  if (
    /^(?:go ahead|proceed|do it|make it so|sounds good|that works|yes|yep|yeah|okay|ok)$/i.test(
      followup,
    )
  ) {
    return 'Continue';
  }
  if (
    /^(?:it|this|that)(?: still)? (?:doesn't|does not|isn't|is not|won't|will not|can't|cannot) (?:work|look right|behave|load|open|save|update)$/i.test(
      followup,
    )
  ) {
    return 'Fix';
  }
  if (/^is (?:it|this|that) (?:appropriate|correct|right|done|working)$/i.test(followup)) {
    return 'Review';
  }
  if (
    /^(?:do|does|did) (?:the )?(?:older|other|previous) chats? (?:do |have )?(?:it|this|that|the same)$/i.test(
      followup,
    )
  ) {
    return 'Verify';
  }
  if (/^(?:what happens )?if i(?:'ve| have)\b/i.test(followup)) return 'Review';
  const match = followup.match(
    /^(implement|discuss|fix|review|investigate|test|verify|finish|continue|change|update|improve|explain|build|create|add|try|explore|resolve|do)(?: (?:it|this|that|the same|the change|the fix|the issue|the problem|these changes|those changes))?$/i,
  );
  if (!match) return undefined;
  const action = match[1].toLowerCase();
  if (action === 'do' || action === 'try') return 'Continue';
  return `${action.charAt(0).toUpperCase()}${action.slice(1)}`;
}

function contextualWorkTopic(value: string) {
  return value
    .replace(
      /^(?:Implement|Discuss|Fix|Review|Investigate|Test|Verify|Finish|Continue|Change|Update|Improve|Explain|Build|Create|Add|Explore|Resolve|Summarise|Use)\s+/i,
      '',
    )
    .replace(/^Make\s+/i, '')
    .trim();
}

function usefulSavedTitle(
  value: string | undefined,
  presentation: ConversationTitlePresentation = 'compact',
) {
  const title = value?.trim() ?? '';
  if (!title || /^(?:studio|codex|chat|new chat|conversation)$/i.test(title)) return '';
  return conciseWorkSummary(title, presentation);
}

function conversationTitle(
  thread: CodexConversationTitleSource | undefined,
  presentation: ConversationTitlePresentation,
) {
  const latestPrompt = codexConversationRequestText(thread?.preview)
    .replace(/https?:\/\/\S+/gi, '')
    .trim();
  const latestSummary = conciseWorkSummary(latestPrompt, presentation);
  const followupAction = vagueFollowupAction(latestPrompt);
  if (followupAction) {
    const contextPrompts = [
      thread?.previousPreview,
      ...(Array.isArray(thread?.contextPreviews) ? thread.contextPreviews : []),
    ]
      .map((value) =>
        codexConversationRequestText(value)
          .replace(/https?:\/\/\S+/gi, '')
          .trim(),
      )
      .filter(
        (value, index, values) =>
          Boolean(value) && value !== latestPrompt && values.indexOf(value) === index,
      );
    const previousSummary = contextPrompts
      .filter((value) => !vagueFollowupAction(value))
      .map((value) => conciseWorkSummary(value, presentation))
      .find(Boolean);
    const contextSummary = previousSummary || usefulSavedTitle(thread?.name, presentation);
    if (contextSummary) {
      if (followupAction === 'Continue') return contextSummary;
      const topic = contextualWorkTopic(contextSummary);
      return conciseWorkSummary(`${followupAction} ${topic || contextSummary}`, presentation);
    }
  }
  return latestSummary || usefulSavedTitle(thread?.name, presentation) || 'New chat';
}

export function codexConversationTitle(thread: CodexConversationTitleSource | undefined) {
  if (thread?.compactTitle?.trim()) return thread.compactTitle.trim();
  return conversationTitle(thread, 'compact');
}

export function codexConversationDropdownTitle(thread: CodexConversationTitleSource | undefined) {
  if (thread?.dropdownTitle?.trim()) return thread.dropdownTitle.trim();
  return conversationTitle(thread, 'dropdown');
}
