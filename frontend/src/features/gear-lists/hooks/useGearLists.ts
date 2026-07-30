import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthProvider";
import { dashboardKeys } from "../../dashboard/api/dashboardApi";
import {
  archiveGearList,
  createGearList,
  gearListKeys,
  getGearList,
  getGearLists,
  updateGearList,
} from "../api/gearListsApi";
import type { GearListInput } from "../types";
import { offlineFirstQuery, requireOnline } from "../../../pwa/offline/offlineQuery";
import { offlineCacheKeys } from "../../../pwa/storage/cacheKeys";
import { useNetwork } from "../../../pwa/offline/NetworkProvider";

export function useGearLists() {
  const { accessToken, user } = useAuth();
  return useQuery({
    queryKey: gearListKeys.list(),
    queryFn: () =>
      offlineFirstQuery({
        userId: user!.id,
        accessToken,
        cacheKey: offlineCacheKeys.gearLists,
        fetchFromApi: getGearLists,
      }),
    enabled: Boolean(user),
    retry: Boolean(accessToken),
  });
}

export function useGearList(id: string) {
  const { accessToken, user } = useAuth();
  return useQuery({
    queryKey: gearListKeys.detail(id),
    queryFn: () =>
      offlineFirstQuery({
        userId: user!.id,
        accessToken,
        cacheKey: offlineCacheKeys.gearList(id),
        fetchFromApi: (token) => getGearList(id, token),
      }),
    enabled: Boolean(user && id),
    retry: Boolean(accessToken),
  });
}

export function useGearListMutations() {
  const { accessToken } = useAuth();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: gearListKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);

  return {
    create: useMutation({
      mutationFn: (input: GearListInput) => {
        requireOnline(isOnline);
        return createGearList(input, accessToken!);
      },
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        input,
      }: {
        id: string;
        input: GearListInput;
      }) => {
        requireOnline(isOnline);
        return updateGearList(id, input, accessToken!);
      },
      onSuccess: invalidate,
    }),
    archive: useMutation({
      mutationFn: (id: string) => {
        requireOnline(isOnline);
        return archiveGearList(id, accessToken!);
      },
      onSuccess: invalidate,
    }),
  };
}
