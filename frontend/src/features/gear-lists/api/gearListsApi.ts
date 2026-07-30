import { apiRequest } from "../../../shared/api/httpClient";
import type {
  GearList,
  GearListDetail,
  GearListInput,
} from "../types";

export const gearListKeys = {
  all: ["gear-lists"] as const,
  list: () => [...gearListKeys.all, "list"] as const,
  detail: (id: string) => [...gearListKeys.all, "detail", id] as const,
};

export function getGearLists(accessToken: string) {
  return apiRequest<GearList[]>("/api/gear-lists", { accessToken });
}

export function getGearList(id: string, accessToken: string) {
  return apiRequest<GearListDetail>(`/api/gear-lists/${id}`, {
    accessToken,
  });
}

export function createGearList(input: GearListInput, accessToken: string) {
  return apiRequest<GearListDetail>("/api/gear-lists", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function updateGearList(
  id: string,
  input: GearListInput,
  accessToken: string,
) {
  return apiRequest<GearListDetail>(`/api/gear-lists/${id}`, {
    method: "PUT",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function archiveGearList(id: string, accessToken: string) {
  return apiRequest<void>(`/api/gear-lists/${id}`, {
    method: "DELETE",
    accessToken,
  });
}
