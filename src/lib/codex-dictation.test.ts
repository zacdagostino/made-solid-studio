import { describe, expect, it } from 'vitest';
import {
  appendCodexDictation,
  maximumCodexPromptLength,
  normalizeCodexDictationTranscript,
} from './codex-dictation';

describe('Codex dictation', () => {
  it('normalizes speech engine whitespace without changing the words', () => {
    expect(normalizeCodexDictationTranscript('  Review   the current\nlayout. ')).toBe(
      'Review the current layout.',
    );
  });

  it('appends speech to an existing draft with readable spacing', () => {
    expect(appendCodexDictation('Please', 'review the mobile layout')).toBe(
      'Please review the mobile layout',
    );
    expect(appendCodexDictation('Please\n', 'review the mobile layout')).toBe(
      'Please\nreview the mobile layout',
    );
  });

  it('keeps the composed prompt within the Codex message limit', () => {
    const result = appendCodexDictation('a'.repeat(maximumCodexPromptLength - 2), 'finished');
    expect(result).toHaveLength(maximumCodexPromptLength);
    expect(result).toBe(`${'a'.repeat(maximumCodexPromptLength - 2)} f`);
  });
});
