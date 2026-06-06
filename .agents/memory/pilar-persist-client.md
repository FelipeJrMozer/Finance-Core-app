---
name: Pilar Persist-Client Gotcha
description: Why @tanstack/react-query-persist-client does not work in this Expo project and what to do instead.
---

**Problem:** `@tanstack/react-query-persist-client` and `@tanstack/query-async-storage-persister` are not symlinked by pnpm into the workspace root `node_modules/@tanstack/` — only the `.pnpm` store has them. Expo Metro bundler resolves packages from the workspace root symlinks and cannot find these packages, causing "Unable to resolve" errors.

**Why:** pnpm hoisting rules in this monorepo do not hoist these packages to the workspace root. The peer-dep version mismatch (persist-client 5.101.0 wants react-query ^5.101.0 but the project uses 5.90.21) compounds the issue.

**How to apply:** If persistence is needed in the future, either:
1. Update @tanstack/react-query to 5.101.x to match and run `pnpm install` to force symlink creation, OR
2. Implement a custom lightweight persist layer using AsyncStorage directly (not via the tanstack persist packages).

For now, use plain `QueryClientProvider` with `queryClient` from `lib/queryClient.ts` which has staleTime/gcTime configured for practical caching without disk persistence.
