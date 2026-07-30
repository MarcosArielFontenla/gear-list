import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { ApiError } from "../../../shared/api/httpClient";
import { gearItemKeys } from "../api/gearItemKeys";
import type { ReorderGearItemsRequest } from "../types";
import { useReorderGearItems } from "./useReorderGearItems";

vi.mock("../../../pwa/offline/NetworkProvider", () => ({
  useNetwork: () => ({ isOnline: true }),
}));

const listId = "10000000-0000-0000-0000-000000000001";
const accessToken = "test-access-token";
const request: ReorderGearItemsRequest = {
  items: [
    {
      itemId: "20000000-0000-0000-0000-000000000001",
      priority: 1,
      position: 0,
      version: "30000000-0000-0000-0000-000000000001",
    },
  ],
};

describe("useReorderGearItems", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the complete reorder request and invalidates the list query", async () => {
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ items: [] }, 200),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(
      () => useReorderGearItems(listId, accessToken),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await result.current.mutateAsync(request);
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    const headers = new Headers(init.headers);

    expect(url).toBe(
      `http://localhost:8080/api/gear-lists/${listId}/items/reorder`,
    );
    expect(init.method).toBe("PUT");
    expect(init.credentials).toBe("include");
    expect(headers.get("Authorization")).toBe(`Bearer ${accessToken}`);
    expect(init.body).toBe(JSON.stringify(request));
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: gearItemKeys.list(listId),
    });
  });

  it("also invalidates after a conflict so active queries reload", async () => {
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            message: "The item order is stale.",
            current: [],
          },
          409,
        ),
      ),
    );
    const { result } = renderHook(
      () => useReorderGearItems(listId, accessToken),
      { wrapper: createWrapper(queryClient) },
    );

    let mutationError: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync(request);
      } catch (error) {
        mutationError = error;
      }
    });

    expect(mutationError).toBeInstanceOf(ApiError);
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: gearItemKeys.list(listId),
      });
    });
  });
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
