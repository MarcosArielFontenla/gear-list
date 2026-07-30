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
import {
  isNetworkError,
  isUnauthorizedError,
} from "../../shared/api/httpClient";
import { clearCachedResponses } from "../../pwa/storage/offlineDatabase";
import {
  clearOfflineIdentity,
  getOfflineIdentity,
  saveOfflineIdentity,
} from "../../pwa/storage/offlineIdentity";
import { useNetwork } from "../../pwa/offline/NetworkProvider";
import * as authApi from "./api/authApi";
import type {
  AuthResponse,
  CurrentUser,
  LoginInput,
  RegisterInput,
} from "./types";

type AuthContextValue = {
  accessToken: string | null;
  user: CurrentUser | null;
  isBootstrapping: boolean;
  isOfflineSession: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
};

type SessionState = {
  accessToken: string | null;
  expiresAt: string | null;
  user: CurrentUser;
};

const AuthContext = createContext<AuthContextValue | null>(null);
let pendingRefresh: Promise<AuthResponse> | null = null;

function requestRefresh() {
  pendingRefresh ??= authApi.refreshSession().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { isOnline } = useNetwork();
  const [session, setSession] = useState<SessionState | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const sessionRevision = useRef(0);
  const previousOnline = useRef(isOnline);

  const acceptSession = useCallback((next: AuthResponse) => {
    setSession(next);
    saveOfflineIdentity(next.user);
    return next.accessToken;
  }, []);

  const acceptOfflineSession = useCallback(() => {
    const identity = getOfflineIdentity();

    if (!identity) {
      setSession(null);
      return null;
    }

    setSession({
      accessToken: null,
      expiresAt: null,
      user: identity,
    });
    return identity;
  }, []);

  const refresh = useCallback(async () => {
    try {
      return acceptSession(await requestRefresh());
    } catch (error) {
      if (isNetworkError(error)) {
        acceptOfflineSession();
      } else {
        clearOfflineIdentity();
        setSession(null);
        queryClient.clear();
      }
      return null;
    }
  }, [acceptOfflineSession, acceptSession, queryClient]);

  useEffect(() => {
    let active = true;
    const revision = sessionRevision.current;

    void requestRefresh()
      .then((next) => {
        if (active && sessionRevision.current === revision) {
          acceptSession(next);
        }
      })
      .catch((error) => {
        if (active && sessionRevision.current === revision) {
          if (isNetworkError(error)) {
            acceptOfflineSession();
          } else {
            clearOfflineIdentity();
            setSession(null);
          }
        }
      })
      .finally(() => {
        if (active) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      active = false;
    };
  }, [acceptOfflineSession, acceptSession]);

  useEffect(() => {
    if (!session?.expiresAt || !session.accessToken) {
      return;
    }

    const refreshAt = new Date(session.expiresAt).getTime() - 60_000;
    const delay = Math.max(0, refreshAt - Date.now());
    const timer = window.setTimeout(() => {
      void refresh();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [refresh, session]);

  useEffect(() => {
    const reconnected = !previousOnline.current && isOnline;
    previousOnline.current = isOnline;

    if (reconnected && session && !session.accessToken) {
      void refresh().then((accessToken) => {
        if (accessToken) {
          void queryClient.invalidateQueries();
        }
      });
    }
  }, [isOnline, queryClient, refresh, session]);

  useEffect(() => {
    let isRefreshingAfterUnauthorized = false;

    const recoverSession = (error: unknown) => {
      if (!isUnauthorizedError(error) || isRefreshingAfterUnauthorized) {
        return;
      }

      isRefreshingAfterUnauthorized = true;
      void refresh()
        .then((accessToken) => {
          if (accessToken) {
            void queryClient.invalidateQueries({
              predicate: (query) => isUnauthorizedError(query.state.error),
            });
          }
        })
        .finally(() => {
          isRefreshingAfterUnauthorized = false;
        });
    };

    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        recoverSession(event.query.state.error);
      }
    });
    const unsubscribeMutations = queryClient
      .getMutationCache()
      .subscribe((event) => {
        if (event.type === "updated" && event.action.type === "error") {
          recoverSession(event.mutation.state.error);
        }
      });

    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [queryClient, refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken: session?.accessToken ?? null,
      user: session?.user ?? null,
      isBootstrapping,
      isOfflineSession: Boolean(session && !session.accessToken),
      login: async (input) => {
        sessionRevision.current += 1;
        acceptSession(await authApi.login(input));
        queryClient.clear();
      },
      register: async (input) => {
        sessionRevision.current += 1;
        acceptSession(await authApi.register(input));
        queryClient.clear();
      },
      logout: async () => {
        sessionRevision.current += 1;
        const userId = session?.user.id;
        try {
          await authApi.logout();
        } catch {
          // Logout is always completed locally, including while offline.
        } finally {
          clearOfflineIdentity();
          if (userId) {
            try {
              await clearCachedResponses(userId);
            } catch {
              // IndexedDB cleanup failure must not block local logout.
            }
          }
          setSession(null);
          queryClient.clear();
        }
      },
      refresh,
    }),
    [acceptSession, isBootstrapping, queryClient, refresh, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
