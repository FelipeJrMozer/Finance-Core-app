import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiGet } from '@/services/api';

export interface Benchmarks {
  cdi: number;
  selic: number;
  ipca: number;
  ibov: number;
}

const CACHE_KEY = 'pf_benchmarks_cache';

export async function getBenchmarks(): Promise<Benchmarks> {
  // TODO: backend endpoint /api/market/benchmarks must be implemented.
  // While not available the call will throw and the hook will fall back to AsyncStorage cache.
  const data = await apiGet<Partial<Benchmarks>>('/api/market/benchmarks');
  const normalized: Benchmarks = {
    cdi: Number(data?.cdi) || 0,
    selic: Number(data?.selic) || 0,
    ipca: Number(data?.ipca) || 0,
    ibov: Number(data?.ibov) || 0,
  };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: normalized }));
  return normalized;
}

async function readCache(): Promise<Benchmarks | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data) return parsed.data as Benchmarks;
  } catch {}
  return null;
}

export interface BenchmarksHookResult {
  data: Benchmarks | null;
  isLoading: boolean;
  isStale: boolean;
  source: 'live' | 'cache' | 'none';
  error: unknown;
  refetch: UseQueryResult<Benchmarks>['refetch'];
}

/**
 * React Query hook for benchmarks with AsyncStorage fallback.
 * - Prefers live API; caches the latest successful response.
 * - On error, returns the last cached value as `data` and flags `isStale=true`.
 * - Never returns hardcoded defaults silently.
 */
export function useBenchmarks(): BenchmarksHookResult {
  const query = useQuery<Benchmarks>({
    queryKey: ['benchmarks'],
    queryFn: getBenchmarks,
    staleTime: 1000 * 60 * 60, // 1h
    retry: 1,
  });

  const [cache, setCache] = React.useState<Benchmarks | null>(null);
  const [cacheLoaded, setCacheLoaded] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    readCache().then((c) => {
      if (!alive) return;
      setCache(c);
      setCacheLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  const warnedRef = React.useRef(false);
  React.useEffect(() => {
    if (query.isError && cache && !warnedRef.current) {
      warnedRef.current = true;
      console.warn('[benchmarks] API failed, using cached values');
    }
  }, [query.isError, cache]);

  if (query.data) {
    return {
      data: query.data,
      isLoading: query.isLoading,
      isStale: false,
      source: 'live',
      error: null,
      refetch: query.refetch,
    };
  }

  if (query.isError && cache) {
    return {
      data: cache,
      isLoading: false,
      isStale: true,
      source: 'cache',
      error: query.error,
      refetch: query.refetch,
    };
  }

  return {
    data: null,
    isLoading: query.isLoading || !cacheLoaded,
    isStale: false,
    source: 'none',
    error: query.error,
    refetch: query.refetch,
  };
}
