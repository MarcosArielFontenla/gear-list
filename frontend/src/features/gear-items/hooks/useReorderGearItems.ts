import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gearItemKeys } from "../api/gearItemKeys";
import { reorderGearItems } from "../api/reorderGearItems";
import type { ReorderGearItemsRequest } from "../types";
import { requireOnline } from "../../../pwa/offline/offlineQuery";
import { useNetwork } from "../../../pwa/offline/NetworkProvider";

export function useReorderGearItems(
  listId: string,
  accessToken: string,
) {
  const queryClient = useQueryClient();
  const { isOnline } = useNetwork();

  return useMutation({
    mutationFn: (request: ReorderGearItemsRequest) => {
      requireOnline(isOnline);
      return reorderGearItems(listId, request, accessToken);
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: gearItemKeys.list(listId),
      }),
  });
}
