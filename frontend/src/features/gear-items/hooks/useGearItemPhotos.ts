import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthProvider";
import { apiRequest } from "../../../shared/api/httpClient";
import { gearItemKeys } from "../api/gearItemKeys";

export type GearItemPhoto = { id: string; url: string; thumbnailUrl: string; width: number; height: number };
export type PhotoDraft = { id: string; url: string; file?: File };

export function useGearItemPhotos(listId: string, itemId: string | null, enabled = true) {
  const { accessToken, user } = useAuth();
  return useQuery({
    queryKey: [...gearItemKeys.list(listId), "photos", itemId, user?.id],
    queryFn: () => apiRequest<GearItemPhoto[]>(`/api/gear-lists/${listId}/items/${itemId}/photos`, { accessToken: accessToken! }),
    enabled: Boolean(enabled && itemId && accessToken),
    staleTime: 5 * 60_000,
    refetchInterval: 30 * 60_000,
    retry: false,
  });
}
