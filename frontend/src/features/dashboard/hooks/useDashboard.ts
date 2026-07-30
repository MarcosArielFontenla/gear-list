import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthProvider";
import { offlineFirstQuery } from "../../../pwa/offline/offlineQuery";
import { offlineCacheKeys } from "../../../pwa/storage/cacheKeys";
import {
  dashboardKeys,
  getDashboardSummary,
  getGearListSummary,
  getPurchasedItems,
} from "../api/dashboardApi";

export function useDashboardSummary() {
  const { accessToken, user } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () =>
      offlineFirstQuery({
        userId: user!.id,
        accessToken,
        cacheKey: offlineCacheKeys.dashboardSummary,
        fetchFromApi: getDashboardSummary,
      }),
    enabled: Boolean(user),
    retry: Boolean(accessToken),
  });
}

export function useGearListSummary(listId: string) {
  const { accessToken, user } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.listSummary(listId),
    queryFn: () =>
      offlineFirstQuery({
        userId: user!.id,
        accessToken,
        cacheKey: offlineCacheKeys.gearListSummary(listId),
        fetchFromApi: (token) => getGearListSummary(listId, token),
      }),
    enabled: Boolean(user && listId),
    retry: Boolean(accessToken),
  });
}

export function usePurchasedItems() {
  const { accessToken, user } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.purchases(),
    queryFn: () =>
      offlineFirstQuery({
        userId: user!.id,
        accessToken,
        cacheKey: offlineCacheKeys.purchases,
        fetchFromApi: getPurchasedItems,
      }),
    enabled: Boolean(user),
    retry: Boolean(accessToken),
  });
}
