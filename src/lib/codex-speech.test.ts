import { describe, expect, it } from 'vitest';
import {
  codexCloudSpeechChunks,
  codexSpeechChunks,
  codexSpeechLanguage,
  codexSpeechRate,
  codexSpeechText,
  codexSpeechTextFromWord,
  codexSpeechTimeAtWord,
  codexSpeechWordAtTime,
  codexSpeechWords,
  estimatedCodexSpeechSeconds,
  formatCodexSpeechTime,
  preferredEnglishSpeechVoice,
} from './codex-speech';

function speechVoice(
  name: string,
  lang: string,
  { defaultVoice = false, local = false } = {},
): SpeechSynthesisVoice {
  return {
    default: defaultVoice,
    lang,
    localService: local,
    name,
    voiceURI: `test:${name}`,
  };
}

describe('codexSpeechText', () => {
  it('turns common Codex Markdown into speech-friendly plain text', () => {
    const markdown = `# Update **ready**

Here is [the report](https://example.com/report).

- First \`item\`
- Second item

> Note: safe &amp; private.

\`\`\`ts
const value = 1;
\`\`\``;

    expect(codexSpeechText(markdown)).toBe(
      [
        'Update ready.',
        'Here is the report.',
        'First item.',
        'Second item.',
        'Note: safe & private.',
        'Code example omitted.',
      ].join('\n\n'),
    );
  });

  it('handles images, tables, raw links, HTML, and reference definitions', () => {
    const markdown = `![Mobile preview](preview.png)

| State | Result |
| --- | --- |
| Ready | <strong>Passed</strong> |

See https://www.example.com/checks/.

[unused]: https://example.com`;

    expect(codexSpeechText(markdown)).toBe(
      [
        'Image: Mobile preview.',
        'State. Result.',
        'Ready. Passed.',
        'See example.com/checks/.',
      ].join('\n\n'),
    );
  });

  it('returns an empty string for empty or formatting-only input', () => {
    expect(codexSpeechText(' \n---\n')).toBe('');
  });

  it('offers a faithful Literal style while Natural keeps structural markup quiet', () => {
    const markdown = `# Ready

- First check

[Review docs](https://example.com/docs)

\`\`\`ts
const value = 1;
\`\`\``;

    const natural = codexSpeechText(markdown, 'natural');
    const literal = codexSpeechText(markdown, 'literal');

    expect(natural).toContain('Ready.');
    expect(natural).toContain('Code example omitted.');
    expect(natural).not.toContain('Heading.');
    expect(literal).toContain('Heading. Ready.');
    expect(literal).toContain('Bullet. First check.');
    expect(literal).toContain('Review docs, link to example.com/docs.');
    expect(literal).toContain('Code block starts. const value = 1; Code block ends.');
  });
});

describe('codexSpeechChunks', () => {
  it('groups sentences into browser-safe chunks near the default target size', () => {
    const sentence =
      'This completed reply explains the captured evidence, the decision made, and the practical next action for the studio user.';
    const markdown = Array.from({ length: 8 }, () => sentence).join(' ');
    const chunks = codexSpeechChunks(markdown);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 320)).toBe(true);
    expect(chunks.slice(0, -1).every((chunk) => chunk.length >= 200)).toBe(true);
    expect(chunks.join(' ')).toBe(codexSpeechText(markdown).replace(/\s+/g, ' '));
  });

  it('respects a custom maximum while preserving complete words', () => {
    const markdown = Array.from({ length: 70 }, (_, index) => `word${index}`).join(' ');
    const chunks = codexSpeechChunks(markdown, 90);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 90)).toBe(true);
    expect(chunks.join(' ')).toBe(codexSpeechText(markdown));
    expect(chunks.every((chunk) => !chunk.startsWith(' ') && !chunk.endsWith(' '))).toBe(true);
  });

  it('keeps an over-limit unbroken value intact instead of cutting the word', () => {
    const unbrokenValue = 'a'.repeat(120);

    expect(codexSpeechChunks(unbrokenValue, 80)).toEqual([`${unbrokenValue}.`]);
  });

  it('returns no chunks when there is nothing to speak', () => {
    expect(codexSpeechChunks('')).toEqual([]);
  });
});

describe('progressive speech text', () => {
  it('keeps word tracking and resume text aligned', () => {
    const markdown = '# Update\n\n- Review the report carefully';
    expect(codexSpeechWords(markdown)).toEqual(codexSpeechText(markdown).match(/\S+/g));
    expect(codexSpeechTextFromWord(markdown, 2)).toBe('the report carefully.');
  });

  it('calibrates word positions against a measured audio duration', () => {
    const text = 'Short considerably-longer final.';

    expect(codexSpeechWordAtTime(text, 10, 0)).toBe(0);
    expect(codexSpeechWordAtTime(text, 10, 9.99)).toBe(2);
    expect(codexSpeechTimeAtWord(text, 10, 2)).toBeGreaterThan(codexSpeechTimeAtWord(text, 10, 1));
  });
});

describe('codexCloudSpeechChunks', () => {
  it('keeps every UTF-8 chunk inside the cloud byte limit without losing words', () => {
    const source = Array.from({ length: 30 }, () => 'English words and Australian emoji 🦘.').join(
      ' ',
    );
    const chunks = codexCloudSpeechChunks(source, 120);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => new TextEncoder().encode(chunk).byteLength <= 120)).toBe(true);
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(codexSpeechText(source));
  });

  it('splits an unbroken multi-byte value safely', () => {
    const chunks = codexCloudSpeechChunks('🦘'.repeat(20), 16);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => new TextEncoder().encode(chunk).byteLength <= 16)).toBe(true);
  });
});

describe('preferredEnglishSpeechVoice', () => {
  it('prefers a local Australian English voice over every other English voice', () => {
    const remoteAustralian = speechVoice('Remote Australian', 'en-AU');
    const localBritish = speechVoice('Local British', 'en-GB', { local: true });
    const localAustralian = speechVoice('Local Australian', 'en_AU', { local: true });

    expect(preferredEnglishSpeechVoice([remoteAustralian, localBritish, localAustralian])).toBe(
      localAustralian,
    );
  });

  it('prefers another local English voice before a remote English voice', () => {
    const remoteAustralian = speechVoice('Remote Australian', 'en-AU', {
      defaultVoice: true,
    });
    const localBritish = speechVoice('Local British', 'en-GB', { local: true });

    expect(preferredEnglishSpeechVoice([remoteAustralian, localBritish])).toBe(localBritish);
  });

  it('uses an available remote English voice but never selects a non-English voice', () => {
    const remoteEnglish = speechVoice('Remote English', 'en-US');
    const localFrench = speechVoice('Local French', 'fr-FR', {
      defaultVoice: true,
      local: true,
    });

    expect(preferredEnglishSpeechVoice([localFrench, remoteEnglish])).toBe(remoteEnglish);
    expect(preferredEnglishSpeechVoice([localFrench])).toBeUndefined();
    expect(codexSpeechLanguage).toBe('en-AU');
    expect(codexSpeechRate).toBe(0.94);
  });

  it('prefers an explicitly requested English locale before another local accent', () => {
    const remoteAmerican = speechVoice('Remote American', 'en-US');
    const localAustralian = speechVoice('Local Australian', 'en-AU', { local: true });
    const localBritish = speechVoice('Local British', 'en-GB', { local: true });

    expect(
      preferredEnglishSpeechVoice([localAustralian, localBritish, remoteAmerican], 'en_US'),
    ).toBe(remoteAmerican);
  });

  it('prefers a local voice when several voices match the requested locale', () => {
    const remoteBritish = speechVoice('Remote British', 'en-GB', { defaultVoice: true });
    const localBritish = speechVoice('Local British', 'en_GB', { local: true });

    expect(preferredEnglishSpeechVoice([remoteBritish, localBritish], 'en-GB')).toBe(localBritish);
  });
});

describe('estimatedCodexSpeechSeconds', () => {
  it('estimates conversational speech time with a small sentence-pause allowance', () => {
    expect(estimatedCodexSpeechSeconds(['One two three four.', 'Five six seven eight!'])).toBe(4);
    expect(estimatedCodexSpeechSeconds([])).toBe(0);
  });
});

describe('formatCodexSpeechTime', () => {
  it('formats safe whole seconds as a compact minute timeline', () => {
    expect(formatCodexSpeechTime(0)).toBe('0:00');
    expect(formatCodexSpeechTime(65.9)).toBe('1:05');
    expect(formatCodexSpeechTime(-4)).toBe('0:00');
    expect(formatCodexSpeechTime(Number.NaN)).toBe('0:00');
  });
});
