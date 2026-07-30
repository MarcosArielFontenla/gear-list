import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";
import { AuthProvider } from "../../features/auth/AuthProvider";
import { ThemeProvider } from "../../shared/theme/ThemeProvider";
import { NetworkProvider } from "../../pwa/offline/NetworkProvider";
import { PwaProvider } from "../../pwa/service-worker/PwaProvider";
import { shouldRetryRequest } from "../../shared/api/httpClient";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: shouldRetryRequest,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <PwaProvider>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </PwaProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}
