import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// ─── Configure how notifications appear when app is in foreground ────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Request permissions ─────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (!Device.isDevice) {
    // Simulator/emulator — permissions always granted for local notifications
    return true;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowAnnouncements: true,
    },
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('finance-core', {
      name: 'Finance Core',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0096C7',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('darf-alerts', {
      name: 'Alertas de DARF',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9800',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('budget-alerts', {
      name: 'Alertas de Orçamento',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#0096C7',
    });
    await Notifications.setNotificationChannelAsync('weekly-summary', {
      name: 'Resumo Semanal',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#0096C7',
    });
  }

  return status === 'granted';
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}

// ─── Cancel all scheduled notifications by tag ───────────────────────
async function cancelByIdentifier(prefix: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith(prefix)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

// ─── DARF Notifications ──────────────────────────────────────────────
export interface DARFLike {
  id: string;
  type: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  codigoReceita?: string;
}

export async function scheduleDARFNotifications(darfs: DARFLike[]) {
  if (Platform.OS === 'web') return;

  await cancelByIdentifier('darf-');

  const unpaid = darfs.filter((d) => !d.paid);
  for (const darf of unpaid) {
    const due = new Date(darf.dueDate);
    const now = new Date();
    const daysUntilDue = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      // Overdue — fire immediately (once)
      await Notifications.scheduleNotificationAsync({
        identifier: `darf-overdue-${darf.id}`,
        content: {
          title: '⚠️ DARF Vencido!',
          body: `${darf.type} — ${formatBRL(darf.amount)} está vencido desde ${formatDate(darf.dueDate)}. Regularize com multa e juros.`,
          data: { screen: '/(more)/ir', tab: 'darfs' },
          sound: 'default',
          categoryIdentifier: 'darf-alerts',
          ...(Platform.OS === 'android' && { channelId: 'darf-alerts' }),
        },
        trigger: null, // immediate
      });
    } else if (daysUntilDue <= 3) {
      // 3 days or less — fire at 9am on the day of due
      const notifyAt = new Date(due);
      notifyAt.setHours(9, 0, 0, 0);
      if (notifyAt > now) {
        await Notifications.scheduleNotificationAsync({
          identifier: `darf-soon-${darf.id}`,
          content: {
            title: '📋 DARF vence em breve',
            body: `${darf.type} — ${formatBRL(darf.amount)} vence em ${daysUntilDue === 0 ? 'hoje' : `${daysUntilDue} dia(s)`}. Código ${darf.codigoReceita || '—'}.`,
            data: { screen: '/(more)/ir', tab: 'darfs' },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'darf-alerts' }),
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notifyAt },
        });
      }
    } else if (daysUntilDue <= 7) {
      // 7 days — schedule a reminder 3 days before due
      const notifyAt = new Date(due);
      notifyAt.setDate(notifyAt.getDate() - 3);
      notifyAt.setHours(9, 0, 0, 0);
      if (notifyAt > now) {
        await Notifications.scheduleNotificationAsync({
          identifier: `darf-reminder-${darf.id}`,
          content: {
            title: '📋 Lembrete de DARF',
            body: `${darf.type} — ${formatBRL(darf.amount)} vence em ${daysUntilDue} dias (${formatDate(darf.dueDate)}).`,
            data: { screen: '/(more)/ir', tab: 'darfs' },
            ...(Platform.OS === 'android' && { channelId: 'darf-alerts' }),
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notifyAt },
        });
      }
    } else {
      // More than 7 days — schedule 7 days and 3 days before
      const notify7 = new Date(due);
      notify7.setDate(notify7.getDate() - 7);
      notify7.setHours(9, 0, 0, 0);

      const notify3 = new Date(due);
      notify3.setDate(notify3.getDate() - 3);
      notify3.setHours(9, 0, 0, 0);

      if (notify7 > now) {
        await Notifications.scheduleNotificationAsync({
          identifier: `darf-7d-${darf.id}`,
          content: {
            title: '📋 DARF em 7 dias',
            body: `${darf.type} — ${formatBRL(darf.amount)} vence em ${formatDate(darf.dueDate)}.`,
            data: { screen: '/(more)/ir', tab: 'darfs' },
            ...(Platform.OS === 'android' && { channelId: 'darf-alerts' }),
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notify7 },
        });
      }
      if (notify3 > now) {
        await Notifications.scheduleNotificationAsync({
          identifier: `darf-3d-${darf.id}`,
          content: {
            title: '⚠️ DARF em 3 dias',
            body: `${darf.type} — ${formatBRL(darf.amount)} vence dia ${formatDate(darf.dueDate)}. Código ${darf.codigoReceita || '—'}.`,
            data: { screen: '/(more)/ir', tab: 'darfs' },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId: 'darf-alerts' }),
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notify3 },
        });
      }
    }
  }
}

// ─── Budget Notifications ────────────────────────────────────────────
export interface BudgetLike {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: 'monthly' | 'weekly';
}

export async function checkAndNotifyBudgets(budgets: BudgetLike[]) {
  if (Platform.OS === 'web') return;

  await cancelByIdentifier('budget-');

  for (const budget of budgets) {
    const pct = budget.limit > 0 ? budget.spent / budget.limit : 0;

    if (pct >= 1.0) {
      await Notifications.scheduleNotificationAsync({
        identifier: `budget-exceeded-${budget.id}`,
        content: {
          title: '🔴 Orçamento estourado!',
          body: `${budget.category}: ${formatBRL(budget.spent)} de ${formatBRL(budget.limit)} (${Math.round(pct * 100)}%). Revise seus gastos.`,
          data: { screen: '/(more)/budgets' },
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId: 'budget-alerts' }),
        },
        trigger: null,
      });
    } else if (pct >= 0.8) {
      await Notifications.scheduleNotificationAsync({
        identifier: `budget-warning-${budget.id}`,
        content: {
          title: '🟡 Orçamento quase no limite',
          body: `${budget.category}: ${formatBRL(budget.spent)} de ${formatBRL(budget.limit)} (${Math.round(pct * 100)}%). Faltam ${formatBRL(budget.limit - budget.spent)}.`,
          data: { screen: '/(more)/budgets' },
          ...(Platform.OS === 'android' && { channelId: 'budget-alerts' }),
        },
        trigger: null,
      });
    }
  }
}

// ─── Weekly Summary Notification ─────────────────────────────────────
export async function scheduleWeeklySummary(
  monthlyExpenses: number,
  monthlyIncome: number,
  netResult: number
) {
  if (Platform.OS === 'web') return;

  await cancelByIdentifier('weekly-');

  // Find the next Monday at 9:00am
  const now = new Date();
  const nextMonday = new Date(now);
  const day = nextMonday.getDay();
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  nextMonday.setHours(9, 0, 0, 0);

  const balanceSign = netResult >= 0 ? '+' : '';
  const summaryLine =
    netResult >= 0
      ? `Saldo positivo de ${formatBRL(netResult)} este mês. Continue assim! 💪`
      : `Saldo negativo de ${formatBRL(Math.abs(netResult))}. Revise seus gastos. 📊`;

  await Notifications.scheduleNotificationAsync({
    identifier: `weekly-summary-next`,
    content: {
      title: '📊 Resumo Semanal — Finance Core',
      body: `Receitas: ${formatBRL(monthlyIncome)} | Gastos: ${formatBRL(monthlyExpenses)} | ${summaryLine}`,
      data: { screen: '/(tabs)' },
      ...(Platform.OS === 'android' && { channelId: 'weekly-summary' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: nextMonday,
    },
  });
}

// ─── Subscription reminder ───────────────────────────────────────────
export interface SubscriptionLike {
  id: string;
  name: string;
  amount: number;
  nextBillingDate: string;
  active: boolean;
}

export async function scheduleSubscriptionReminders(subscriptions: SubscriptionLike[]) {
  if (Platform.OS === 'web') return;

  await cancelByIdentifier('sub-');

  const active = subscriptions.filter((s) => s.active);
  const now = new Date();

  for (const sub of active) {
    const billing = new Date(sub.nextBillingDate);
    const daysUntil = Math.floor((billing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil >= 0 && daysUntil <= 3) {
      const notifyAt = new Date(billing);
      notifyAt.setHours(9, 0, 0, 0);
      if (notifyAt > now) {
        await Notifications.scheduleNotificationAsync({
          identifier: `sub-${sub.id}`,
          content: {
            title: '💳 Assinatura a vencer',
            body: `${sub.name} — ${formatBRL(sub.amount)} será cobrado em ${daysUntil === 0 ? 'hoje' : `${daysUntil} dia(s)`}.`,
            data: { screen: '/(more)/family' },
            ...(Platform.OS === 'android' && { channelId: 'finance-core' }),
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notifyAt },
        });
      }
    }
  }
}

// ─── Cancel all notifications ─────────────────────────────────────────
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}

// ─── Helpers ─────────────────────────────────────────────────────────
function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
