import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthProvider";
import { dashboardKeys } from "../../dashboard/api/dashboardApi";
import { gearListKeys } from "../../gear-lists/api/gearListsApi";
import { gearItemKeys } from "../api/gearItemKeys";
import {
  createGearItem,
  deleteGearItem,
  getGearItem,
  getGearItems,
  updateGearItem,
  updateGearItemStatus,
} from "../api/gearItemsApi";
import type {
  GearItemInput,
  UpdateGearItemInput,
  UpdateGearItemStatusInput,
} from "../types";
import { offlineFirstQuery, requireOnline } from "../../../pwa/offline/offlineQuery";
import { offlineCacheKeys } from "../../../pwa/storage/cacheKeys";
import { useNetwork } from "../../../pwa/offline/NetworkProvider";

export function useGearItems(listId: string) {
  const { accessToken, user } = useAuth();
  return useQuery({
    queryKey: gearItemKeys.list(listId),
    queryFn: () =>
      offlineFirstQuery({
        userId: user!.id,
        accessToken,
        cacheKey: offlineCacheKeys.gearItems(listId),
        fetchFromApi: (token) => getGearItems(listId, token),
      }),
    enabled: Boolean(user && listId),
    retry: Boolean(accessToken),
  });
}

export function useGearItem(listId: string, itemId: string | null) {
  const { accessToken, user } = useAuth();
  return useQuery({
    queryKey: [...gearItemKeys.list(listId), "detail", itemId],
    queryFn: () =>
      offlineFirstQuery({
        userId: user!.id,
        accessToken,
        cacheKey: offlineCacheKeys.gearItem(listId, itemId!),
        fetchFromApi: (token) => getGearItem(listId, itemId!, token),
      }),
    enabled: Boolean(user && listId && itemId),
    retry: Boolean(accessToken),
  });
}

export function useGearItemMutations(listId: string) {
  const { accessToken } = useAuth();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: gearItemKeys.list(listId),
      }),
      queryClient.invalidateQueries({ queryKey: gearListKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);

  return {
    create: useMutation({
      mutationFn: (input: GearItemInput) => {
        requireOnline(isOnline);
        return createGearItem(listId, input, accessToken!);
      },
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({
        itemId,
        input,
      }: {
        itemId: string;
        input: UpdateGearItemInput;
      }) => {
        requireOnline(isOnline);
        return updateGearItem(listId, itemId, input, accessToken!);
      },
      onSuccess: invalidate,
    }),
    status: useMutation({
      mutationFn: ({
        itemId,
        input,
      }: {
        itemId: string;
        input: UpdateGearItemStatusInput;
      }) => {
        requireOnline(isOnline);
        return updateGearItemStatus(listId, itemId, input, accessToken!);
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (itemId: string) => {
        requireOnline(isOnline);
        return deleteGearItem(listId, itemId, accessToken!);
      },
      onSuccess: invalidate,
    }),
  };
}
