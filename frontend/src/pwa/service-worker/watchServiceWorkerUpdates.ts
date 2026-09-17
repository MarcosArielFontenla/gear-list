/**
 * Mobile browsers suspend timers in the background, so also check on resume.
 * Failed checks leave the current offline-capable version running.
 */
export function watchServiceWorkerUpdates(registration: ServiceWorkerRegistration) {
  let checking = false;
  let stopped = false;

  const check = async () => {
    if (
      stopped ||
      checking ||
      registration.installing ||
      !navigator.onLine ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    checking = true;
    try {
      await registration.update();
    } catch {
      // Retry on the next check when the network/server becomes available.
    } finally {
      checking = false;
    }
  };

  const onResume = () => void check();
  const interval = window.setInterval(onResume, 60_000);
  window.addEventListener("focus", onResume);
  window.addEventListener("pageshow", onResume);
  window.addEventListener("online", onResume);
  document.addEventListener("visibilitychange", onResume);
  onResume();

  return () => {
    stopped = true;
    window.clearInterval(interval);
    window.removeEventListener("focus", onResume);
    window.removeEventListener("pageshow", onResume);
    window.removeEventListener("online", onResume);
    document.removeEventListener("visibilitychange", onResume);
  };
}
