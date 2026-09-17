import { updatesBlocked } from "./updateBlocker";
import { watchServiceWorkerUpdates } from "./watchServiceWorkerUpdates";

/** Activation and page reload are separate so another tab cannot discard this tab's editor. */
export function registerAppWorker(onOfflineReady: () => void, reload = () => window.location.reload()) {
  let disposed = false;
  let registration: ServiceWorkerRegistration | undefined;
  let stopChecks: (() => void) | undefined;
  let pendingReload = false;
  let controlled = Boolean(navigator.serviceWorker.controller);
  const watched = new Set<ServiceWorker>();

  const apply = () => {
    if (disposed || updatesBlocked()) return;
    if (pendingReload) {
      pendingReload = false;
      reload();
    } else registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
  };
  const controllerChanged = () => {
    if (controlled) {
      pendingReload = true;
      apply();
    }
    controlled = true;
  };
  const changed = () => {
    for (const worker of watched) {
      if (worker.state === "installed") {
        if (!navigator.serviceWorker.controller) onOfflineReady();
        apply();
      }
    }
  };
  const watchInstalling = () => {
    const worker = registration?.installing;
    if (!worker || watched.has(worker)) return;
    watched.add(worker);
    worker.addEventListener("statechange", changed);
  };

  window.addEventListener("app-update-ready", apply);
  navigator.serviceWorker.addEventListener("controllerchange", controllerChanged);
  void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then(value => {
    if (disposed) return;
    registration = value;
    value.addEventListener("updatefound", watchInstalling);
    watchInstalling();
    apply();
    stopChecks = watchServiceWorkerUpdates(value);
  }).catch(() => { /* Retry registration on the next app launch. */ });

  return () => {
    disposed = true;
    stopChecks?.();
    registration?.removeEventListener("updatefound", watchInstalling);
    watched.forEach(worker => worker.removeEventListener("statechange", changed));
    window.removeEventListener("app-update-ready", apply);
    navigator.serviceWorker.removeEventListener("controllerchange", controllerChanged);
  };
}
