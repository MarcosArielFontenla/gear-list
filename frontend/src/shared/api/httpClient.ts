const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"
).replace(/\/$/, "");

export function getApiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

type ApiRequestOptions = RequestInit & {
  accessToken?: string;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API request failed with status ${status}.`);
    this.name = "ApiError";
  }
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

export function shouldRetryRequest(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status < 500) {
    return false;
  }

  return failureCount < 1;
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "OfflineWriteError") {
    return error.message;
  }

  if (!(error instanceof ApiError)) {
    return "No pudimos completar la operación. Intenta nuevamente.";
  }

  if (typeof error.body === "object" && error.body !== null) {
    const body = error.body as {
      detail?: string;
      title?: string;
      errors?: Record<string, string[]>;
    };
    const firstValidationError = body.errors
      ? Object.values(body.errors).flat()[0]
      : undefined;
    return (
      firstValidationError ??
      body.title ??
      body.detail ??
      "La API rechazó la solicitud."
    );
  }

  return error.status === 401
    ? "Tu sesión venció. Vuelve a iniciar sesión."
    : "La API no está disponible en este momento.";
}

export async function apiRequest<T>(
  path: string,
  { accessToken, headers, ...init }: ApiRequestOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers);

  if (init.body && !(init.body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: requestHeaders,
    credentials: "include",
  });
  const contentType = response.headers.get("Content-Type") ?? "";
  const body = (contentType.includes("application/json") || contentType.includes("application/problem+json"))
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  return body as T;
}

export function isNetworkError(error: unknown) {
  return error instanceof Error && !(error instanceof ApiError);
}
