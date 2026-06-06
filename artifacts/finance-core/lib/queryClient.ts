import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount: number, error: unknown) => {
        const status = (error as { status?: number })?.status;
        return typeof status === 'number' && status >= 500 && failureCount < 2;
      },
    },
  },
});
