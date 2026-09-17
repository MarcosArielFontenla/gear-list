import { registerAppWorker } from "./registerAppWorker";
import { blockUpdates } from "./updateBlocker";

describe("safe automatic PWA updates", () => {
  let container: EventTarget & { controller: object | null; register: ReturnType<typeof vi.fn> };
  let registration: EventTarget & { waiting: { postMessage: ReturnType<typeof vi.fn> }; installing: null; update: ReturnType<typeof vi.fn> };
  let stop: (() => void) | undefined;
  let release: (() => void) | undefined;
  beforeEach(() => {
    vi.useFakeTimers();
    registration = Object.assign(new EventTarget(), { waiting: { postMessage: vi.fn() }, installing: null, update: vi.fn().mockResolvedValue(undefined) });
    container = Object.assign(new EventTarget(), { controller: {}, register: vi.fn().mockResolvedValue(registration) });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: container });
  });
  afterEach(() => {
    stop?.(); release?.(); release = undefined;
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });
  it("automatically activates a waiting update when there is no editor", async () => {
    stop = registerAppWorker(vi.fn());
    await Promise.resolve();
    expect(registration.waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });
  it("waits for the editor to close before activating a new worker", async () => {
    release = blockUpdates();
    stop = registerAppWorker(vi.fn());
    await Promise.resolve();
    expect(registration.waiting.postMessage).not.toHaveBeenCalled();
    release(); release = undefined;
    expect(registration.waiting.postMessage).toHaveBeenCalledOnce();
  });
  it("defers reload if a different tab activates while this tab is editing", async () => {
    const reload = vi.fn();
    release = blockUpdates();
    stop = registerAppWorker(vi.fn(), reload);
    await Promise.resolve();
    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).not.toHaveBeenCalled();
    release(); release = undefined;
    expect(reload).toHaveBeenCalledOnce();
  });
  it("does not reload on the first installation or after unmount", async () => {
    container.controller = null;
    const reload = vi.fn();
    stop = registerAppWorker(vi.fn(), reload);
    await Promise.resolve();
    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).not.toHaveBeenCalled();
    stop();
    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).not.toHaveBeenCalled();
  });
});
