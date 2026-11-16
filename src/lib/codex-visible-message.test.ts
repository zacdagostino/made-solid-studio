import { describe, expect, it } from 'vitest';
import { codexVisibleFailure, codexVisibleUserMessage } from './codex-visible-message';
import source from '../../scripts/codex-feedback-bridge.mjs?raw';

const instruction = source.match(/const progressUpdateInstruction =\s*'([^']+)';/)![1];

describe('legacy runtime failed messages', () => {
  it('removes the exact transport suffix while preserving the entered paragraphs', () => {
    const prompt = 'Hello did you finish\n\nPlease explain.';
    expect(
      codexVisibleUserMessage(
        `${prompt}\n\nCaptured from: Made Solid Studio · https://dev.studio.madesolid.com.au/\n\n${instruction}`,
      ),
    ).toBe(prompt);
  });
  it('preserves ordinary messages mentioning capture context or instructions', () => {
    for (const text of ['Hello', 'Explain this:\n\nCaptured from: Made Solid Studio', instruction])
      expect(codexVisibleUserMessage(text)).toBe(text);
  });
  it('reports failed turns from an older runtime without inventing a cause', () => {
    expect(codexVisibleFailure({ lastTurnStatus: 'failed' })).toContain('could not complete');
    expect(codexVisibleFailure({ lastTurnStatus: 'completed' })).toBeUndefined();
    expect(codexVisibleFailure({ working: true, lastTurnStatus: 'failed' })).toBeUndefined();
    expect(
      codexVisibleFailure({ lastTurnStatus: 'failed', failure: 'Verified provider failure' }),
    ).toBe('Verified provider failure');
  });
});
