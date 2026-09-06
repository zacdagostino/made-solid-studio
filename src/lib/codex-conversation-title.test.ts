import { describe, expect, it } from 'vitest';
import { codexConversationRequestText, codexConversationTitle } from './codex-conversation-title';

describe('codexConversationTitle', () => {
  it('turns the latest conversational request into a compact work summary', () => {
    expect(
      codexConversationTitle({
        name: 'Older automatic title',
        preview:
          "Ok sweet, can we have every chat's title in the chat drop down be a consise summary of the latest thing it's done or is doing so I can identify it at a glance?\n\nCaptured from: Made Solid Studio",
      }),
    ).toBe("Summarise each chat's latest work");
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

  it('shortens long summaries at a readable word boundary', () => {
    const title = codexConversationTitle({
      preview:
        'Review the complete Clientspace administration navigation and reorganise every confusing destination for mobile reviewers',
    });

    expect(title).toBe('Review Clientspace administration navigation and reorganise…');
    expect(title.length).toBeLessThanOrEqual(61);
  });
});
