import { isNetworkError } from "../../shared/api/httpClient";
import {
  getCachedResponse,
  saveCachedResponse,
} from "../storage/offlineDatabase";

export class OfflineDataUnavailableError extends Error {
  constructor() {
    super(
      "No hay una copia sin conexión disponible. Conéctate una vez para descargar estos datos.",
    );
    this.name = "OfflineDataUnavailableError";
  }
}

export class OfflineWriteError extends Error {
  constructor() {
    super("Esta acción requiere conexión. No se guardó ningún cambio.");
    this.name = "OfflineWriteError";
  }
}

type OfflineFirstOptions<T> = {
  userId: string;
  accessToken: string | null;
  cacheKey: string;
  fetchFromApi: (accessToken: string) => Promise<T>;
};

export async function offlineFirstQuery<T>({
  userId,
  accessToken,
  cacheKey,
  fetchFromApi,
}: OfflineFirstOptions<T>): Promise<T> {
  if (accessToken) {
    try {
      const response = await fetchFromApi(accessToken);
      try {
        await saveCachedResponse(userId, cacheKey, response);
      } catch {
        // IndexedDB failures must not hide a valid server response.
      }
      return response;
    } catch (error) {
      if (!isNetworkError(error)) {
        throw error;
      }
    }
  }

  const cached = await getCachedResponse<T>(userId, cacheKey);

  if (!cached) {
    throw new OfflineDataUnavailableError();
  }

  return cached.payload;
}

export function requireOnline(isOnline: boolean) {
  if (!isOnline) {
    throw new OfflineWriteError();
  }
}

export function getOfflineQueryErrorMessage(
  error: unknown,
  fallback: string,
) {
  return error instanceof OfflineDataUnavailableError
    ? error.message
    : fallback;
}
