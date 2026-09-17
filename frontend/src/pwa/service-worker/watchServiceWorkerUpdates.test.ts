import { watchServiceWorkerUpdates } from "./watchServiceWorkerUpdates";

describe("automatic service worker update checks", () => {
  let cleanup: (() => void) | undefined;
  const update = vi.fn();
  const registration = { update, installing: null } as unknown as ServiceWorkerRegistration;

  beforeEach(() => {
    vi.useFakeTimers();
    update.mockReset().mockResolvedValue(registration);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  });

  afterEach(() => {
    cleanup?.();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("checks immediately, periodically, and on mobile/browser resume or reconnection", async () => {
    cleanup = watchServiceWorkerUpdates(registration);
    expect(update).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(update).toHaveBeenCalledTimes(2);

    for (const event of ["focus", "pageshow", "online"]) {
      window.dispatchEvent(new Event(event));
      await Promise.resolve();
    }
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();
    expect(update).toHaveBeenCalledTimes(6);
  });

  it("skips offline/background checks and checks again when visible and online", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    cleanup = watchServiceWorkerUpdates(registration);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(update).not.toHaveBeenCalled();

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    window.dispatchEvent(new Event("online"));
    expect(update).not.toHaveBeenCalled();

    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(update).toHaveBeenCalledOnce();
  });

  it("prevents concurrent checks and retries failed requests", async () => {
    let rejectUpdate!: (reason: Error) => void;
    update.mockReturnValueOnce(new Promise((_, reject) => { rejectUpdate = reject; }));
    cleanup = watchServiceWorkerUpdates(registration);
    window.dispatchEvent(new Event("focus"));
    expect(update).toHaveBeenCalledOnce();

    rejectUpdate(new Error("Network unavailable"));
    await Promise.resolve();
    window.dispatchEvent(new Event("online"));
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("does not check during installation and removes timers and listeners on cleanup", async () => {
    const installing = { update, installing: {} } as unknown as ServiceWorkerRegistration;
    cleanup = watchServiceWorkerUpdates(installing);
    expect(update).not.toHaveBeenCalled();
    cleanup();

    cleanup = watchServiceWorkerUpdates(registration);
    await Promise.resolve();
    cleanup();
    update.mockClear();
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("pageshow"));
    window.dispatchEvent(new Event("online"));
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(update).not.toHaveBeenCalled();
  });
});
