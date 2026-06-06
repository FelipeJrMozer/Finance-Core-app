---
name: Pilar Financeiro Phase Progress
description: Which phases are complete and what is pending for the Pilar Financeiro mobile app.
---

Phases 1–8 complete. Phases 9–10 pending.

**Phase 8 skip list (too risky or incompatible):**
- 8.2 — full useQuery migration of FinanceContext (too large, too risky)
- 8.7 — expo-image (assets work, low impact)
- 8.9 — code splitting via React.lazy (incompatible with Expo Router file-based routing)
- 8.10 — performance telemetry (nice-to-have)
- Persistence with PersistQueryClientProvider (see pilar-persist-client.md)

**Phase 8 delivered:**
- lib/queryClient.ts with staleTime 60s, gcTime 5min, retry on 5xx
- QueryClient imported centrally from lib/queryClient.ts in _layout.tsx
- FlashList replacing FlatList in notifications.tsx and bills.tsx (estimatedItemSize set)
- FinanceContext Provider value wrapped in useMemo (all deps explicit)
- Prefetch accounts/transactions/dashboard-summary on login in AuthContext

**Pre-existing TS errors (do NOT fix):**
- colors.accent in index.tsx
- useNotifications/useTransactionIntent/NotificationService missing stubs
- LineChart type mismatch in reports.tsx
- allowAnnouncements iOS SDK

**Key conventions:**
- t.transactionDate ?? t.date for date access
- settings?.investmentsEnabled !== false (default true)
- settings?.pjEnabled === true (default false, opt-in)
- Benchmarks: cdi, selic, ipca, ibov (NO ibovespa, usd, eur)
- apiPost<T>(path, body?) — 2 params only
- Accent IDs: ocean|indigo|green|blue|purple|orange|red|neutral; legacy royalblue→blue
