const progressInstruction =
  'During longer work, keep the user oriented with concise commentary at meaningful transitions: explain what you are checking, what you learned or changed, and what remains. When a website search, tool, file change, or check produces a meaningful verified result, include that result in the next commentary and explain how it affects the remaining work. Send an update before a long tool run. Do not narrate routine actions, repeat yourself, expose hidden reasoning, or claim unverified progress.';

/** Compatibility for runtime versions that expose the transport prompt on failed turns. */
export function codexVisibleUserMessage(text: string) {
  const suffix = `\n\n${progressInstruction}`;
  if (!text.endsWith(suffix)) return text;
  const body = text.slice(0, -suffix.length);
  const capture = body.lastIndexOf('\n\nCaptured from: Made Solid Studio');
  return capture < 0 ? text : body.slice(0, capture);
}

export function codexVisibleFailure(
  thread: { working?: boolean; lastTurnStatus?: string; failure?: string } | undefined,
) {
  if (!thread || thread.working) return undefined;
  return (
    thread.failure ||
    (thread.lastTurnStatus === 'failed'
      ? 'Codex could not complete the latest request. Your message is saved. Review the request and service status before trying again.'
      : undefined)
  );
}
