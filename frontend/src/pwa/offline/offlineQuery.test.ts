import { ApiError } from "../../shared/api/httpClient";
import { offlineDatabase } from "../storage/offlineDatabase";
import {
  OfflineDataUnavailableError,
  OfflineWriteError,
  offlineFirstQuery,
  requireOnline,
} from "./offlineQuery";

describe("offlineFirstQuery", () => {
  beforeEach(async () => {
    await offlineDatabase.responses.clear();
  });

  it("stores an online response and returns it when offline", async () => {
    const online = await offlineFirstQuery({
      userId: "user-1",
      accessToken: "token",
      cacheKey: "gear-lists:list",
      fetchFromApi: vi.fn().mockResolvedValue([{ id: "list-1" }]),
    });
    const offlineFetcher = vi.fn();

    const offline = await offlineFirstQuery({
      userId: "user-1",
      accessToken: null,
      cacheKey: "gear-lists:list",
      fetchFromApi: offlineFetcher,
    });

    expect(online).toEqual([{ id: "list-1" }]);
    expect(offline).toEqual(online);
    expect(offlineFetcher).not.toHaveBeenCalled();
  });

  it("keeps private cached responses isolated by user", async () => {
    await offlineFirstQuery({
      userId: "user-1",
      accessToken: "token",
      cacheKey: "gear-lists:list",
      fetchFromApi: vi.fn().mockResolvedValue([{ id: "private-list" }]),
    });

    await expect(
      offlineFirstQuery({
        userId: "user-2",
        accessToken: null,
        cacheKey: "gear-lists:list",
        fetchFromApi: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(OfflineDataUnavailableError);
  });

  it("does not hide server errors with stale cached data", async () => {
    await offlineFirstQuery({
      userId: "user-1",
      accessToken: "token",
      cacheKey: "dashboard:summary",
      fetchFromApi: vi.fn().mockResolvedValue({ listCount: 1 }),
    });

    await expect(
      offlineFirstQuery({
        userId: "user-1",
        accessToken: "token",
        cacheKey: "dashboard:summary",
        fetchFromApi: vi.fn().mockRejectedValue(new ApiError(500, {})),
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("blocks writes without pretending they were saved", () => {
    expect(() => requireOnline(false)).toThrow(OfflineWriteError);
    expect(() => requireOnline(true)).not.toThrow();
  });
});
