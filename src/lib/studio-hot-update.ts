const studioUpdateStartedEvent = 'made-solid:studio-update-started';
const studioUpdateFinishedEvent = 'made-solid:studio-update-finished';
const minimumVisibleDuration = 650;
const maximumVisibleDuration = 10_000;

export function subscribeToStudioUpdates(listener: (updating: boolean) => void) {
  const handleStarted = () => listener(true);
  const handleFinished = () => listener(false);
  document.addEventListener(studioUpdateStartedEvent, handleStarted);
  document.addEventListener(studioUpdateFinishedEvent, handleFinished);
  return () => {
    document.removeEventListener(studioUpdateStartedEvent, handleStarted);
    document.removeEventListener(studioUpdateFinishedEvent, handleFinished);
  };
}

export function installStudioHotUpdateNotifications() {
  const hot = import.meta.hot;
  if (!hot) return () => undefined;
  let finishTimer: number | undefined;

  const finishUpdate = () => {
    document.dispatchEvent(new Event(studioUpdateFinishedEvent));
    finishTimer = undefined;
  };
  const handleUpdateStarted = () => {
    if (finishTimer) window.clearTimeout(finishTimer);
    document.dispatchEvent(new Event(studioUpdateStartedEvent));
    finishTimer = window.setTimeout(finishUpdate, maximumVisibleDuration);
  };
  const handleUpdateFinished = () => {
    if (finishTimer) window.clearTimeout(finishTimer);
    finishTimer = window.setTimeout(finishUpdate, minimumVisibleDuration);
  };

  hot.on('vite:beforeUpdate', handleUpdateStarted);
  hot.on('vite:afterUpdate', handleUpdateFinished);
  return () => {
    if (finishTimer) window.clearTimeout(finishTimer);
    hot.off('vite:beforeUpdate', handleUpdateStarted);
    hot.off('vite:afterUpdate', handleUpdateFinished);
  };
}
