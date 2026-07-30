import Dexie, { type EntityTable } from "dexie";

export type CachedResponse<T = unknown> = {
  id: string;
  userId: string;
  key: string;
  payload: T;
  updatedAt: string;
};

class OfflineDatabase extends Dexie {
  responses!: EntityTable<CachedResponse, "id">;

  constructor() {
    super("loadout-queue-offline");
    this.version(1).stores({
      responses: "id, userId, updatedAt",
    });
  }
}

export const offlineDatabase = new OfflineDatabase();

export async function saveCachedResponse<T>(
  userId: string,
  key: string,
  payload: T,
) {
  const snapshot: CachedResponse<T> = {
    id: createId(userId, key),
    userId,
    key,
    payload,
    updatedAt: new Date().toISOString(),
  };
  await offlineDatabase.responses.put(snapshot);
  return snapshot;
}

export function getCachedResponse<T>(userId: string, key: string) {
  return offlineDatabase.responses.get(createId(userId, key)) as Promise<
    CachedResponse<T> | undefined
  >;
}

export function clearCachedResponses(userId: string) {
  return offlineDatabase.responses.where("userId").equals(userId).delete();
}

function createId(userId: string, key: string) {
  return `${userId}::${key}`;
}
