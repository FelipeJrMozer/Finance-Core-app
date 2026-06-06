---
name: Phase 9 toast + confirm patterns
description: Global toast singleton and confirmDestructive pattern used in Pilar Financeiro
---

# Global Toast System

`utils/toast.ts` — module-level listeners array (event emitter); `toast.success/error/info/warning()` emit; `_subscribeToast()` returns unsubscribe fn.

`components/ui/ToastContainer.tsx` — subscribes via `_subscribeToast` in `useEffect`, updates local state, renders `<Toast>` from `./Toast.tsx`.

Mounted inside `<KeyboardProvider>` in `app/_layout.tsx`.

`utils/notify.ts` — `notifySuccess/Error/Info` now call `toast.*` instead of `Alert.alert`.

**Why:** centralized, non-blocking toast vs. blocking Alert.alert modals.

# confirmDestructive

`utils/confirm.ts` — `ActionSheetIOS` on iOS, `Alert.alert` on Android; returns `Promise<boolean>`.

Signature: `confirmDestructive(title, message?, destructiveLabel = 'Excluir')`

Applied to 7 screens: `transaction/[id]`, `investment/[id]`, `bills`, `recurring`, `debts`, `watchlist`, `custom-alerts`.

**How to apply:** `const ok = await confirmDestructive(...); if (!ok) return;` — then execute the delete.

# Screen Transitions (_layout.tsx)

Default `screenOptions.animation: 'slide_from_right'` for all Stack screens.
Add screens get `presentation: 'modal', animation: 'slide_from_bottom'`.
