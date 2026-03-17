import { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import { useFinance } from '@/context/FinanceContext';
import { useTheme } from '@/context/ThemeContext';
import {
  requestNotificationPermissions,
  checkAndNotifyBudgets,
  scheduleWeeklySummary,
  cancelAllNotifications,
} from '@/services/NotificationService';

export function useNotifications() {
  const { budgets, transactions, monthlyIncome, monthlyExpenses, netResult } = useFinance();
  const { notifyBudget, notifyWeekly } = useTheme();
  const lastScheduleRef = useRef<number>(0);

  const scheduleAll = useCallback(async () => {
    if (Platform.OS === 'web') return;

    const now = Date.now();
    if (now - lastScheduleRef.current < 60_000) return;
    lastScheduleRef.current = now;

    try {
      if (!notifyBudget && !notifyWeekly) {
        await cancelAllNotifications();
        return;
      }

      const granted = await requestNotificationPermissions();
      if (!granted) return;

      if (notifyBudget) {
        const nowDate = new Date();
        const month = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
        const budgetsWithSpent = budgets.map((b) => {
          const spent = transactions
            .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(month))
            .reduce((s, t) => s + t.amount, 0);
          return { id: b.id, category: b.category, limit: b.limit, spent, period: b.month };
        });
        await checkAndNotifyBudgets(budgetsWithSpent);
      }

      if (notifyWeekly) {
        await scheduleWeeklySummary(monthlyExpenses, monthlyIncome, netResult);
      }
    } catch (err) {
      console.warn('[Notifications] Schedule error:', err);
    }
  }, [budgets, transactions, monthlyIncome, monthlyExpenses, netResult, notifyBudget, notifyWeekly]);

  useEffect(() => {
    scheduleAll();
  }, [scheduleAll]);

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

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let tapSub: { remove: () => void } | null = null;
    import('expo-notifications').then((Notifications) => {
      tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as { screen?: string };
        if (data?.screen) {
          try { router.push(data.screen as any); } catch {}
        }
      });
    }).catch(() => {});
    return () => { tapSub?.remove(); };
  }, []);
}
