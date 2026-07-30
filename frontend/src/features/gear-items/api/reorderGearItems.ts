import { apiRequest } from "../../../shared/api/httpClient";
import type {
  ReorderGearItemsRequest,
  ReorderGearItemsResponse,
} from "../types";

export function reorderGearItems(
  listId: string,
  request: ReorderGearItemsRequest,
  accessToken: string,
): Promise<ReorderGearItemsResponse> {
  return apiRequest<ReorderGearItemsResponse>(
    `/api/gear-lists/${listId}/items/reorder`,
    {
      method: "PUT",
      accessToken,
      body: JSON.stringify(request),
    },
  );
}
