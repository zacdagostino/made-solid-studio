const DEFAULT_MAXIMUM_CHUNK_LENGTH = 320;
const ESTIMATED_WORDS_PER_MINUTE = 150;

export const codexSpeechLanguage = 'en-AU';
export const codexSpeechRate = 0.94;
export const codexSpeechReadingStyles = ['natural', 'literal'] as const;
export type CodexSpeechStyle = (typeof codexSpeechReadingStyles)[number];

const spokenEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  hellip: '…',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

function decodeEntities(value: string) {
  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi,
    (
      entity,
      decimal: string | undefined,
      hexadecimal: string | undefined,
      name: string | undefined,
    ) => {
      const codePoint = decimal
        ? Number.parseInt(decimal, 10)
        : hexadecimal
          ? Number.parseInt(hexadecimal, 16)
          : undefined;

      if (codePoint !== undefined) {
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return entity;
        }
      }

      return name ? (spokenEntities[name.toLowerCase()] ?? entity) : entity;
    },
  );
}

function spokenUrl(value: string) {
  return value
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}

function hasTerminalPunctuation(value: string) {
  return /[.!?…:;]["'’”)\]]*$/.test(value);
}

function punctuate(value: string) {
  return value && !hasTerminalPunctuation(value) ? `${value}.` : value;
}

/**
 * Converts the lightweight Markdown found in Codex replies into text suitable
 * for a SpeechSynthesisUtterance. Fenced code is announced but intentionally
 * omitted because reading source punctuation aloud is rarely useful.
 */
export function codexSpeechText(markdown: string, style: CodexSpeechStyle = 'natural'): string {
  let text = markdown.replace(/\r\n?/g, '\n');

  text = text
    .replace(/```(?:[^\n]*)\n?([\s\S]*?)```/g, (_match, code: string) =>
      style === 'literal'
        ? `\n\nCode block starts. ${code.replace(/\s+/g, ' ').trim()} Code block ends.\n\n`
        : '\n\nCode example omitted.\n\n',
    )
    .replace(/~~~(?:[^\n]*)\n?([\s\S]*?)~~~/g, (_match, code: string) =>
      style === 'literal'
        ? `\n\nCode block starts. ${code.replace(/\s+/g, ' ').trim()} Code block ends.\n\n`
        : '\n\nCode example omitted.\n\n',
    )
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/^\s*\[[^\]]+\]:\s+\S+.*$/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_match, alt: string) =>
      alt.trim() ? `Image: ${alt.trim()}` : 'Image',
    )
    .replace(/\[([^\]]+)\]\(([^)]*)\)/g, (_match, label: string, url: string) =>
      style === 'literal' ? `${label}, link to ${spokenUrl(url)}` : label,
    )
    .replace(/<(https?:\/\/[^>]+)>/gi, (_match, url: string) => spokenUrl(url))
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/https?:\/\/[^\s)\]}>,]+/gi, (url) => spokenUrl(url))
    .replace(/`([^`]+)`/g, (_match, code: string) => (style === 'literal' ? `code ${code}` : code))
    .replace(/(\*\*|__|~~)(.*?)\1/g, '$2')
    .replace(/([*_])([^\n]*?\S)\1/g, '$2')
    .replace(/\\([\\`*_[\]{}()#+\-.!>|])/g, '$1');

  const paragraphs: string[] = [];
  let currentLines: string[] = [];

  const flushCurrentLines = () => {
    const paragraph = currentLines.join(' ').replace(/\s+/g, ' ').trim();
    if (paragraph) paragraphs.push(punctuate(paragraph));
    currentLines = [];
  };

  for (const sourceLine of text.split('\n')) {
    const trimmedLine = sourceLine.trim();
    if (!trimmedLine) {
      flushCurrentLines();
      continue;
    }

    if (/^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/.test(trimmedLine)) {
      continue;
    }

    const isStandalone = /^(?:#{1,6}\s+|>\s*|[-+*]\s+|\d+[.)]\s+|[-+*]\s+\[[ xX]\]\s+|\|)/.test(
      trimmedLine,
    );
    const literalPrefix =
      style !== 'literal'
        ? ''
        : /^#{1,6}\s+/.test(trimmedLine)
          ? 'Heading. '
          : /^>\s*/.test(trimmedLine)
            ? 'Quote. '
            : /^[-+*]\s+\[[xX]\]\s+/.test(trimmedLine)
              ? 'Completed task. '
              : /^[-+*]\s+\[ \]\s+/.test(trimmedLine)
                ? 'Open task. '
                : /^[-+*]\s+/.test(trimmedLine)
                  ? 'Bullet. '
                  : /^\d+[.)]\s+/.test(trimmedLine)
                    ? `Item ${trimmedLine.match(/^\d+/)?.[0]}. `
                    : /^\|/.test(trimmedLine)
                      ? 'Table row. '
                      : '';
    const line = `${literalPrefix}${trimmedLine
      .replace(/^#{1,6}\s+/, '')
      .replace(/^>\s*/, '')
      .replace(/^[-+*]\s+\[[ xX]\]\s+/, '')
      .replace(/^[-+*]\s+/, '')
      .replace(/^\d+[.)]\s+/, '')
      .replace(/^\|\s*|\s*\|$/g, '')
      .replace(/\s*\|\s*/g, '. ')
      .replace(/\s+/g, ' ')
      .trim()}`;
    if (!line || /^[-*_]{3,}$/.test(line)) continue;

    if (isStandalone || line === 'Code example omitted.') {
      flushCurrentLines();
      paragraphs.push(punctuate(line));
      continue;
    }

    currentLines.push(line);
  }

  flushCurrentLines();

  return decodeEntities(paragraphs.join('\n\n')).trim();
}

function sentenceSegments(paragraph: string) {
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
    return [...segmenter.segment(paragraph)].map(({ segment }) => segment.trim()).filter(Boolean);
  }

  return (
    paragraph.match(/.+?(?:[.!?…]+["'’”)\]]*(?=\s|$)|$)/g)?.map((part) => part.trim()) ?? [
      paragraph,
    ]
  );
}

function splitLongSegment(segment: string, maximumLength: number) {
  if (segment.length <= maximumLength) return [segment];

  const words = segment.split(/\s+/);
  const estimatedChunkCount = Math.ceil(segment.length / maximumLength);
  const targetLength = Math.min(maximumLength, Math.ceil(segment.length / estimatedChunkCount));
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > targetLength) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

/**
 * Produces sentence-aware utterance chunks. Chunks stay under maximumLength
 * unless the source contains a single unbroken word longer than that limit.
 */
export function codexSpeechChunks(
  markdown: string,
  maximumLength = DEFAULT_MAXIMUM_CHUNK_LENGTH,
  style: CodexSpeechStyle = 'natural',
): string[] {
  const text = codexSpeechText(markdown, style);
  if (!text) return [];

  const safeMaximumLength =
    Number.isFinite(maximumLength) && maximumLength > 0
      ? Math.floor(maximumLength)
      : DEFAULT_MAXIMUM_CHUNK_LENGTH;
  const softParagraphMinimum = Math.min(200, Math.floor(safeMaximumLength * 0.65));
  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (current) chunks.push(current);
    current = '';
  };

  for (const paragraph of text.split(/\n{2,}/).filter(Boolean)) {
    if (current.length >= softParagraphMinimum) flush();

    const segments = sentenceSegments(paragraph).flatMap((segment) =>
      splitLongSegment(segment, safeMaximumLength),
    );

    for (const segment of segments) {
      const candidate = current ? `${current} ${segment}` : segment;
      if (current && candidate.length > safeMaximumLength) flush();
      current = current ? `${current} ${segment}` : segment;
    }
  }

  flush();
  return chunks;
}

/**
 * Produces speech chunks that remain inside a UTF-8 byte limit used by cloud
 * synthesis APIs. Natural word boundaries are preserved whenever possible.
 */
export function codexCloudSpeechChunks(
  markdown: string,
  maximumBytes = 4_200,
  style: CodexSpeechStyle = 'natural',
): string[] {
  const safeMaximumBytes =
    Number.isFinite(maximumBytes) && maximumBytes > 0 ? Math.floor(maximumBytes) : 4_200;
  const encoder = new TextEncoder();
  const sourceChunks = codexSpeechChunks(markdown, safeMaximumBytes, style);
  const chunks: string[] = [];

  for (const source of sourceChunks) {
    if (encoder.encode(source).byteLength <= safeMaximumBytes) {
      chunks.push(source);
      continue;
    }
    let current = '';
    for (const word of source.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && encoder.encode(candidate).byteLength > safeMaximumBytes) {
        chunks.push(current);
        current = '';
      }
      if (encoder.encode(word).byteLength <= safeMaximumBytes) {
        current = current ? `${current} ${word}` : word;
        continue;
      }
      for (const character of word) {
        const characterCandidate = current ? `${current}${character}` : character;
        if (current && encoder.encode(characterCandidate).byteLength > safeMaximumBytes) {
          chunks.push(current);
          current = character;
        } else {
          current = characterCandidate;
        }
      }
    }
    if (current) chunks.push(current);
  }

  return chunks;
}

export function codexSpeechWords(markdown: string, style: CodexSpeechStyle = 'natural'): string[] {
  return codexSpeechText(markdown, style).match(/\S+/g) ?? [];
}

export function codexSpeechTextFromWord(
  markdown: string,
  wordIndex: number,
  style: CodexSpeechStyle = 'natural',
): string {
  const text = codexSpeechText(markdown, style);
  if (!text) return '';
  const words = [...text.matchAll(/\S+/g)];
  const safeIndex = Math.max(0, Math.min(Math.floor(wordIndex), words.length));
  return safeIndex < words.length ? text.slice(words[safeIndex].index).trimStart() : '';
}

function speechWordWeights(text: string) {
  return (text.match(/\S+/g) ?? []).map((word) => {
    const spokenCharacters = word.replace(/[^\p{L}\p{N}]/gu, '').length;
    const punctuationPause = /[.!?…]["'’”)\]]*$/.test(word)
      ? 5
      : /[,;:]["'’”)\]]*$/.test(word)
        ? 2
        : 0;
    return Math.max(1, spokenCharacters) + punctuationPause;
  });
}

/**
 * Maps cloud audio time to a word using the segment's measured duration. Cloud
 * HD voices do not return word timepoints, so longer words and punctuation are
 * given proportionally more of the timeline.
 */
export function codexSpeechWordAtTime(text: string, duration: number, seconds: number): number {
  const weights = speechWordWeights(text);
  if (!weights.length) return 0;
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const progress = Math.max(0, Math.min(seconds / Math.max(duration, 0.001), 0.999999));
  const targetWeight = progress * totalWeight;
  let elapsedWeight = 0;
  for (let index = 0; index < weights.length; index += 1) {
    elapsedWeight += weights[index];
    if (targetWeight < elapsedWeight) return index;
  }
  return weights.length - 1;
}

export function codexSpeechTimeAtWord(text: string, duration: number, wordIndex: number): number {
  const weights = speechWordWeights(text);
  if (!weights.length) return 0;
  const safeIndex = Math.max(0, Math.min(Math.floor(wordIndex), weights.length));
  const elapsedWeight = weights.slice(0, safeIndex).reduce((sum, weight) => sum + weight, 0);
  return (elapsedWeight / weights.reduce((sum, weight) => sum + weight, 0)) * duration;
}

function normalizedSpeechLanguage(language: string) {
  return language.trim().toLowerCase().replaceAll('_', '-');
}

function isEnglishSpeechLanguage(language: string) {
  const normalized = normalizedSpeechLanguage(language);
  return normalized === 'en' || normalized.startsWith('en-');
}

/**
 * Chooses only English voices. An Australian local voice wins, followed by
 * another local English voice and finally any browser-provided English voice.
 */
export function preferredEnglishSpeechVoice(
  voices: SpeechSynthesisVoice[],
  preferredLanguage?: string,
) {
  const englishVoices = voices.filter((voice) => isEnglishSpeechLanguage(voice.lang));
  const normalizedPreferredLanguage = preferredLanguage
    ? normalizedSpeechLanguage(preferredLanguage)
    : undefined;
  if (normalizedPreferredLanguage && isEnglishSpeechLanguage(normalizedPreferredLanguage)) {
    const exactLocaleVoices = englishVoices.filter(
      (voice) => normalizedSpeechLanguage(voice.lang) === normalizedPreferredLanguage,
    );
    if (exactLocaleVoices.length) {
      return [...exactLocaleVoices].sort(
        (first, second) =>
          Number(second.localService) - Number(first.localService) ||
          Number(second.default) - Number(first.default) ||
          first.name.localeCompare(second.name),
      )[0];
    }
  }
  const localAustralianVoices = englishVoices.filter(
    (voice) => voice.localService && normalizedSpeechLanguage(voice.lang) === 'en-au',
  );
  const otherLocalEnglishVoices = englishVoices.filter(
    (voice) => voice.localService && normalizedSpeechLanguage(voice.lang) !== 'en-au',
  );
  const otherEnglishVoices = englishVoices.filter((voice) => !voice.localService);
  const candidates = localAustralianVoices.length
    ? localAustralianVoices
    : otherLocalEnglishVoices.length
      ? otherLocalEnglishVoices
      : otherEnglishVoices;

  return [...candidates].sort((first, second) => {
    const score = (voice: SpeechSynthesisVoice) =>
      (normalizedSpeechLanguage(voice.lang) === 'en-au' ? 2 : 0) + (voice.default ? 1 : 0);
    return score(second) - score(first) || first.name.localeCompare(second.name);
  })[0];
}

/**
 * Browser speech synthesis does not expose a dependable total duration, so
 * this intentionally returns an approximation based on a conversational rate
 * with a small allowance for sentence pauses.
 */
export function estimatedCodexSpeechSeconds(chunks: string[]) {
  const text = chunks.join(' ').trim();
  if (!text) return 0;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const sentencePauseCount = text.match(/[.!?…:;](?:["'’”)\]]|\s|$)/g)?.length ?? 0;
  return Math.max(
    1,
    Math.ceil((wordCount / ESTIMATED_WORDS_PER_MINUTE) * 60 + sentencePauseCount * 0.18),
  );
}

export function formatCodexSpeechTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`;
}
