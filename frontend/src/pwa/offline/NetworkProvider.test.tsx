import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { NetworkProvider, useNetwork } from "./NetworkProvider";

describe("NetworkProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("verifies the API and invalidates queries after reconnection", async () => {
    const queryClient = new QueryClient();
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    );

    const { result } = renderHook(useNetwork, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isOnline).toBe(true));

    act(() => window.dispatchEvent(new Event("offline")));
    expect(result.current.status).toBe("offline");

    act(() => window.dispatchEvent(new Event("online")));
    await waitFor(() => expect(result.current.isOnline).toBe(true));
    expect(result.current.reconnected).toBe(true);
    expect(invalidate).toHaveBeenCalled();
  });
});

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>{children}</NetworkProvider>
      </QueryClientProvider>
    );
  };
}
