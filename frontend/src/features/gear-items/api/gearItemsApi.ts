import { apiRequest } from "../../../shared/api/httpClient";
import type {
  GearItemDetailResponse,
  GearItemInput,
  GearItemListResponse,
  UpdateGearItemInput,
  UpdateGearItemStatusInput,
} from "../types";

export function getGearItems(listId: string, accessToken: string) {
  return apiRequest<GearItemListResponse[]>(
    `/api/gear-lists/${listId}/items`,
    { accessToken },
  );
}

export function getGearItem(
  listId: string,
  itemId: string,
  accessToken: string,
) {
  return apiRequest<GearItemDetailResponse>(
    `/api/gear-lists/${listId}/items/${itemId}`,
    { accessToken },
  );
}

export function createGearItem(
  listId: string,
  input: GearItemInput,
  accessToken: string,
) {
  return apiRequest<GearItemDetailResponse>(
    `/api/gear-lists/${listId}/items`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    },
  );
}

export function updateGearItem(
  listId: string,
  itemId: string,
  input: UpdateGearItemInput,
  accessToken: string,
) {
  return apiRequest<GearItemDetailResponse>(
    `/api/gear-lists/${listId}/items/${itemId}`,
    {
      method: "PUT",
      accessToken,
      body: JSON.stringify(input),
    },
  );
}

export function updateGearItemStatus(
  listId: string,
  itemId: string,
  input: UpdateGearItemStatusInput,
  accessToken: string,
) {
  return apiRequest<GearItemDetailResponse>(
    `/api/gear-lists/${listId}/items/${itemId}/status`,
    {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(input),
    },
  );
}

export function deleteGearItem(
  listId: string,
  itemId: string,
  accessToken: string,
) {
  return apiRequest<void>(
    `/api/gear-lists/${listId}/items/${itemId}`,
    { method: "DELETE", accessToken },
  );
}

export function saveGearItemWithPhotos(
  listId: string, itemId: string | null, input: GearItemInput | UpdateGearItemInput,
  photos: import("../hooks/useGearItemPhotos").PhotoDraft[], accessToken: string,
) {
  const body = new FormData();
  body.append("input", JSON.stringify(input));
  let fileIndex = 0;
  body.append("photoOrder", JSON.stringify(photos.map(photo => {
    if (!photo.file) return photo.id;
    body.append("photos", photo.file);
    return "new-" + fileIndex++;
  })));
  return apiRequest<GearItemDetailResponse>(
    `/api/gear-lists/${listId}/items/${itemId ? itemId + "/" : ""}with-photos`,
    { method: itemId ? "PUT" : "POST", accessToken, body },
  );
}
