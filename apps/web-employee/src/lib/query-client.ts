import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // 1 min — matches API Redis TTLs; avoids redundant refetches
      gcTime: 15 * 60_000,        // 15 min — keep cached pages in memory across nav
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,   // Sync stale data when network recovers
    },
    mutations: { retry: false },
  },
});
