import { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import { useFinance } from '@/context/FinanceContext';
import { useTheme } from '@/context/ThemeContext';
import {
  requestNotificationPermissions,
  scheduleDARFNotifications,
  checkAndNotifyBudgets,
  scheduleWeeklySummary,
  scheduleSubscriptionReminders,
  cancelAllNotifications,
} from '@/services/NotificationService';

export function useNotifications() {
  const { darfs, budgets, transactions, monthlyIncome, monthlyExpenses, netResult, subscriptions } = useFinance();
  const { notifyDARF, notifyBudget, notifyWeekly } = useTheme();
  const lastScheduleRef = useRef<number>(0);

  const scheduleAll = useCallback(async () => {
    if (Platform.OS === 'web') return;

    // Rate-limit: don't reschedule more than once per minute
    const now = Date.now();
    if (now - lastScheduleRef.current < 60_000) return;
    lastScheduleRef.current = now;

    try {
      if (!notifyDARF && !notifyBudget && !notifyWeekly) {
        await cancelAllNotifications();
        return;
      }

      const granted = await requestNotificationPermissions();
      if (!granted) return;

      // DARF alerts
      if (notifyDARF) {
        await scheduleDARFNotifications(darfs);
      }

      // Budget alerts
      if (notifyBudget) {
        const nowDate = new Date();
        const month = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
        const budgetsWithSpent = budgets.map((b) => {
          const spent = transactions
            .filter((t) => t.type === 'expense' && t.category === b.category && t.date.startsWith(month))
            .reduce((s, t) => s + t.amount, 0);
          return { id: b.id, category: b.category, limit: b.limit, spent, period: b.period };
        });
        await checkAndNotifyBudgets(budgetsWithSpent);
      }

      // Weekly summary
      if (notifyWeekly) {
        await scheduleWeeklySummary(monthlyExpenses, monthlyIncome, netResult);
      }

      // Subscription reminders (alongside DARF alerts)
      if (notifyDARF) {
        await scheduleSubscriptionReminders(subscriptions);
      }
    } catch (err) {
      console.warn('[Notifications] Schedule error:', err);
    }
  }, [darfs, budgets, transactions, subscriptions, monthlyIncome, monthlyExpenses, netResult, notifyDARF, notifyBudget, notifyWeekly]);

  // Schedule on mount and when data changes
  useEffect(() => {
    scheduleAll();
  }, [scheduleAll]);

  // Re-schedule when app comes to foreground
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        lastScheduleRef.current = 0;
        scheduleAll();
      }
    });
    return () => sub.remove();
  }, [scheduleAll]);

  // Handle notification tap — navigate to the right screen
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let tapSub: { remove: () => void } | null = null;
    let receivedSub: { remove: () => void } | null = null;

    // Dynamically import expo-notifications on native only
    import('expo-notifications').then((Notifications) => {
      tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as { screen?: string };
        if (data?.screen) {
          try {
            router.push(data.screen as any);
          } catch { /* ignore */ }
        }
      });

      receivedSub = Notifications.addNotificationReceivedListener((_n) => {
        // Banner shown automatically by the handler in NotificationService.native.ts
      });
    }).catch(() => { /* not available on web */ });

    return () => {
      tapSub?.remove();
      receivedSub?.remove();
    };
  }, []);
}
