import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

type PwaContextValue = {
  canInstall: boolean;
  isInstalled: boolean;
  offlineReady: boolean;
  needRefresh: boolean;
  install: () => Promise<boolean>;
  applyUpdate: () => Promise<void>;
  dismissOfflineReady: () => void;
  dismissUpdate: () => void;
};

const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({ children }: PropsWithChildren) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandalone);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW: (_url, registration) => {
      setRegistration(registration ?? null);
    },
  });

  useEffect(() => {
    if (!registration) {
      return;
    }
    const interval = window.setInterval(
      () => void registration.update().catch(() => undefined),
      60 * 60 * 1_000,
    );
    return () => window.clearInterval(interval);
  }, [registration]);

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) {
      return false;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    return choice.outcome === "accepted";
  }, [installPrompt]);

  const value = useMemo<PwaContextValue>(
    () => ({
      canInstall: Boolean(installPrompt),
      isInstalled,
      offlineReady,
      needRefresh,
      install,
      applyUpdate: async () => {
        await updateServiceWorker(true);
      },
      dismissOfflineReady: () => setOfflineReady(false),
      dismissUpdate: () => setNeedRefresh(false),
    }),
    [
      install,
      installPrompt,
      isInstalled,
      needRefresh,
      offlineReady,
      setNeedRefresh,
      setOfflineReady,
      updateServiceWorker,
    ],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const context = useContext(PwaContext);

  if (!context) {
    throw new Error("usePwa must be used inside PwaProvider.");
  }

  return context;
}

function isStandalone() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    iosNavigator.standalone === true
  );
}
