import { describe, expect, it } from 'vitest';
import {
  codexConversationDropdownTitle,
  codexConversationRequestText,
  codexConversationTitle,
} from './codex-conversation-title';

describe('codexConversationTitle', () => {
  it('uses AI-interpreted titles for both selector presentations', () => {
    const thread = {
      compactTitle: 'Interpret chat task titles',
      dropdownTitle: 'Use AI to interpret each chat’s current task',
      preview: 'No I want ai to interpret it',
    };

    expect(codexConversationTitle(thread)).toBe('Interpret chat task titles');
    expect(codexConversationDropdownTitle(thread)).toBe(
      'Use AI to interpret each chat’s current task',
    );
  });

  it('turns the latest conversational request into a compact work summary', () => {
    const thread = {
      name: 'Older automatic title',
      preview:
        "Ok sweet, can we have every chat's title in the chat drop down be a consise summary of the latest thing it's done or is doing so I can identify it at a glance?\n\nCaptured from: Made Solid Studio",
    };

    expect(codexConversationTitle(thread)).toBe("Summarise each chat's latest work");
    expect(codexConversationDropdownTitle(thread)).toBe("Summarise each chat's latest work");
  });

  it('keeps both title presentations concise while preserving useful dropdown context', () => {
    const thread = {
      preview:
        'Please review the complete Clientspace navigation because the old page labels are confusing and make it hard to find the right client section.',
    };

    expect(codexConversationTitle(thread)).toBe('Review Clientspace navigation');
    expect(codexConversationDropdownTitle(thread)).toBe(
      'Review Clientspace navigation and confusing page labels',
    );
    expect(codexConversationDropdownTitle(thread)).not.toContain('…');
  });

  it('describes the dropdown-only expansion without lengthening the selected title', () => {
    const thread = {
      preview:
        "Make it longer so the full idea is captured and don't have it cut off with ... but only make it long in the dropdown, not when I click on the chat.",
    };

    expect(codexConversationTitle(thread)).toBe('Show full titles in the chat dropdown');
    expect(codexConversationDropdownTitle(thread)).toBe(
      'Show complete contextual titles only in the open dropdown',
    );
  });

  it('interprets the current task instead of copying a complete prompt', () => {
    const thread = {
      preview:
        "I don't want my complete message in the dropdown; I still want a concise interpretation of the current task for each chat title.",
    };

    expect(codexConversationDropdownTitle(thread)).toBe(
      'Use concise current-task interpretations for chat titles',
    );
  });

  it('summarises a long cross-device preview request as one task', () => {
    const thread = {
      preview:
        "Develop something let's discuss before implementation. I mainly develop this on my phone and want to see websites in desktop, phone, and tablet layouts. I want a website preview similar to client review so I can inspect the desktop layout from my phone.",
    };

    expect(codexConversationDropdownTitle(thread)).toBe(
      'Preview desktop, tablet, and phone website layouts from a phone',
    );
  });

  it('uses the underlying task when a Codespace resume message is latest', () => {
    const thread = {
      preview:
        'The Codespace paused while this turn was still running. Continue the same request from the saved transcript and current workspace. Preserve existing changes and finish the implementation.',
      contextPreviews: [
        'Please add a protected desktop, tablet, and phone website preview that I can inspect from my phone.',
      ],
    };

    expect(codexConversationDropdownTitle(thread)).toBe(
      'Preview desktop, tablet, and phone website layouts from a phone',
    );
  });

  it('uses the newest prompt before capture instructions or URLs', () => {
    expect(
      codexConversationTitle({
        preview:
          'Please speed up the Clientspace admin tabs so I can move between them quickly.\n\nCaptured from: Made Solid Studio · https://dev.studio.madesolid.com.au/',
      }),
    ).toBe('Speed up the Clientspace admin tabs');
  });

  it('falls back to the saved name and then New chat', () => {
    expect(codexConversationTitle({ name: 'Client handoff review' })).toBe('Client handoff review');
    expect(codexConversationTitle(undefined)).toBe('New chat');
  });

  it('keeps the recent request readable while removing captured-page instructions', () => {
    expect(
      codexConversationRequestText(
        'Keep my latest message visible at the top.\n\nCaptured from: Made Solid Studio\n\nDuring longer work, keep me oriented.',
      ),
    ).toBe('Keep my latest message visible at the top.');
  });

  it('summarises the combined current-title and pinned-request task directly', () => {
    expect(
      codexConversationTitle({
        preview:
          'I tried implementing each chat name to be a concise summary of the most recent messages. Also can we have my recent message in each chat sticky to the top without crowding the UI?',
      }),
    ).toBe('Update chat titles and pin latest request');
  });

  it('uses the previous request to interpret a vague implementation follow-up', () => {
    expect(
      codexConversationTitle({
        preview: 'Implement it.',
        previousPreview: 'Please create concise contextual chat titles.',
      }),
    ).toBe('Implement concise contextual chat titles');
  });

  it('walks past multiple vague legacy prompts to recover the latest meaningful task', () => {
    expect(
      codexConversationTitle({
        name: 'Do it',
        preview: 'Do the previous chats do it?',
        contextPreviews: [
          'Is that appropriate?',
          "If I've branched?",
          'Please add contextual chat titles and distinct running and completed states.',
        ],
      }),
    ).toBe('Verify chat titles and status states');
  });

  it('describes a report that older titles still lack context', () => {
    expect(
      codexConversationTitle({
        preview:
          "It doesn't seem like other chats other than this one have worked. The titles are not giving enough context.",
      }),
    ).toBe('Fix context for previous chat titles');
  });

  it('summarises the combined title and lifecycle-state request concisely', () => {
    expect(
      codexConversationTitle({
        preview:
          'Ok I want the names of each chat to be a concise summary of the most recent task, and in the dropdown show if a chat is currently running and if one is completed.',
      }),
    ).toBe('Improve chat titles and status states');
  });

  it('keeps the conversation subject when the latest reply only confirms it', () => {
    expect(
      codexConversationTitle({
        name: 'Old automatic title',
        preview: 'Go ahead.',
        previousPreview: 'Review the client proposal approval flow.',
      }),
    ).toBe('Review the client proposal approval flow');
  });

  it('uses a meaningful saved title when a vague follow-up has no saved prompt context', () => {
    expect(
      codexConversationTitle({
        name: 'Client proposal workflow',
        preview: 'Discuss this.',
      }),
    ).toBe('Discuss Client proposal workflow');
  });

  it('does not replace a standalone latest request with older context', () => {
    expect(
      codexConversationTitle({
        preview: 'Fix the mobile navigation overflow.',
        previousPreview: 'Review the client proposal approval flow.',
      }),
    ).toBe('Fix the mobile navigation overflow');
  });

  it('recognises a request for interpreted rather than copied chat titles', () => {
    expect(
      codexConversationTitle({
        preview:
          'Do not use the exact latest message for each chat title; give me a concise interpretation with context.',
      }),
    ).toBe('Create contextual chat titles');
  });

  it('interprets loosely worded requests about chats and their titles', () => {
    expect(
      codexConversationTitle({
        preview:
          'You know how the chats in the codex chat their titles update based on the latest message sent. Can you not make it the exact message but have it a concise interpretation that gives me context?',
      }),
    ).toBe('Create contextual chat titles');
  });

  it('shortens long summaries at a readable word boundary', () => {
    const title = codexConversationTitle({
      preview:
        'Review the complete Clientspace administration navigation and reorganise every confusing destination for mobile reviewers',
    });

    expect(title).toBe('Review Clientspace administration navigation…');
    expect(title.length).toBeLessThanOrEqual(49);
  });
});
