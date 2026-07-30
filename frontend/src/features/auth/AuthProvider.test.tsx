import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { ApiError } from "../../shared/api/httpClient";
import { AuthProvider, useAuth } from "./AuthProvider";

const authApiMocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  register: vi.fn(),
}));

vi.mock("./api/authApi", () => authApiMocks);
vi.mock("../../pwa/offline/NetworkProvider", () => ({
  useNetwork: () => ({ isOnline: true }),
}));

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    authApiMocks.refreshSession.mockReset();
  });

  it("clears an expired session when a protected query and refresh return 401", async () => {
    authApiMocks.refreshSession
      .mockResolvedValueOnce({
        accessToken: "expired-access-token",
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
        user: {
          id: "user-1",
          displayName: "Ada",
          email: "ada@example.com",
        },
      })
      .mockRejectedValueOnce(new ApiError(401, ""));

    render(
      <TestProviders>
        <ExpiredQueryProbe />
      </TestProviders>,
    );

    expect(await screen.findByText("Ada")).toBeInTheDocument();
    await waitFor(() =>
      expect(authApiMocks.refreshSession).toHaveBeenCalledTimes(2),
    );
    expect(await screen.findByText("Sin sesión")).toBeInTheDocument();
  });
});

function TestProviders({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

function ExpiredQueryProbe() {
  const { user } = useAuth();

  useQuery({
    enabled: Boolean(user),
    queryFn: () => Promise.reject(new ApiError(401, "")),
    queryKey: ["expired-protected-query"],
    retry: false,
  });

  return <span>{user?.displayName ?? "Sin sesión"}</span>;
}
