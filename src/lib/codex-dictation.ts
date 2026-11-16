export const maximumCodexPromptLength = 4_000;

export function normalizeCodexDictationTranscript(transcript: string) {
  return transcript.replace(/\s+/g, ' ').trim();
}

export function appendCodexDictation(
  draft: string,
  transcript: string,
  maximumLength = maximumCodexPromptLength,
) {
  const spokenText = normalizeCodexDictationTranscript(transcript);
  if (!spokenText) return draft.slice(0, maximumLength);
  const separator = draft && !/\s$/.test(draft) ? ' ' : '';
  return `${draft}${separator}${spokenText}`.slice(0, maximumLength);
}
