import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getApiUrl } from "../../shared/api/httpClient";

export type NetworkStatus = "checking" | "online" | "offline";

type NetworkContextValue = {
  status: NetworkStatus;
  isOnline: boolean;
  reconnected: boolean;
  checkConnectivity: () => Promise<boolean>;
  dismissReconnected: () => void;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<NetworkStatus>(
    navigator.onLine ? "checking" : "offline",
  );
  const [reconnected, setReconnected] = useState(false);
  const previousStatus = useRef<NetworkStatus>(status);

  const applyStatus = useCallback(
    (next: NetworkStatus) => {
      const previous = previousStatus.current;
      previousStatus.current = next;
      setStatus(next);

      if (previous === "offline" && next === "online") {
        setReconnected(true);
        void queryClient.invalidateQueries();
      }
    },
    [queryClient],
  );

  const checkConnectivity = useCallback(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4_000);

    try {
      const response = await fetch(getApiUrl("/api/health"), {
        cache: "no-store",
        credentials: "omit",
        signal: controller.signal,
      });
      const online = response.ok;
      applyStatus(online ? "online" : "offline");
      return online;
    } catch {
      applyStatus("offline");
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }, [applyStatus]);

  useEffect(() => {
    void checkConnectivity();

    const handleOffline = () => applyStatus("offline");
    const handleOnline = () => void checkConnectivity();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void checkConnectivity();
      }
    };
    const interval = window.setInterval(() => {
      if (previousStatus.current !== "online") {
        void checkConnectivity();
      }
    }, 30_000);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [applyStatus, checkConnectivity]);

  useEffect(() => {
    if (!reconnected) {
      return;
    }
    const timer = window.setTimeout(() => setReconnected(false), 4_000);
    return () => window.clearTimeout(timer);
  }, [reconnected]);

  const value = useMemo<NetworkContextValue>(
    () => ({
      status,
      isOnline: status === "online",
      reconnected,
      checkConnectivity,
      dismissReconnected: () => setReconnected(false),
    }),
    [checkConnectivity, reconnected, status],
  );

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);

  if (!context) {
    throw new Error("useNetwork must be used inside NetworkProvider.");
  }

  return context;
}
