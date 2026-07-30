import { apiRequest } from "../../../shared/api/httpClient";
import type {
  DashboardSummary,
  GearListSummary,
  PurchasedItem,
} from "../types";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
  listSummary: (listId: string) =>
    [...dashboardKeys.all, "list-summary", listId] as const,
  purchases: () => [...dashboardKeys.all, "purchases"] as const,
};

export function getDashboardSummary(accessToken: string) {
  return apiRequest<DashboardSummary>("/api/dashboard/summary", {
    accessToken,
  });
}

export function getGearListSummary(listId: string, accessToken: string) {
  return apiRequest<GearListSummary>(
    `/api/gear-lists/${listId}/summary`,
    { accessToken },
  );
}

export function getPurchasedItems(accessToken: string) {
  return apiRequest<PurchasedItem[]>("/api/dashboard/purchases", {
    accessToken,
  });
}
