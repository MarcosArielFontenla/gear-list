import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { PwaProvider, usePwa } from "./PwaProvider";

const updateServiceWorker = vi.fn();

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    offlineReady: [false, vi.fn()],
    needRefresh: [false, vi.fn()],
    updateServiceWorker,
  }),
}));

describe("PwaProvider", () => {
  beforeEach(() => {
    updateServiceWorker.mockReset();
  });

  it("captures the browser install prompt and reports acceptance", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event("beforeinstallprompt");
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({
        outcome: "accepted",
        platform: "web",
      }),
    });
    const { result } = renderHook(usePwa, { wrapper: Wrapper });

    act(() => window.dispatchEvent(event));
    await waitFor(() => expect(result.current.canInstall).toBe(true));

    let installed = false;
    await act(async () => {
      installed = await result.current.install();
    });

    expect(installed).toBe(true);
    expect(prompt).toHaveBeenCalledOnce();
    expect(result.current.canInstall).toBe(false);
  });

  it("tracks the standalone installation event", () => {
    const { result } = renderHook(usePwa, { wrapper: Wrapper });

    act(() => window.dispatchEvent(new Event("appinstalled")));

    expect(result.current.isInstalled).toBe(true);
  });
});

function Wrapper({ children }: PropsWithChildren) {
  return <PwaProvider>{children}</PwaProvider>;
}
