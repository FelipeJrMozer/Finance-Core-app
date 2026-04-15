import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (isExpoGo()) return false;
  try {
    if (!Device.isDevice) return true;
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true, allowAnnouncements: true },
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('finance-core', {
        name: 'Pilar Financeiro',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0096C7',
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
  } catch {
    return false;
  }
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web' || isExpoGo()) return 'denied';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as 'granted' | 'denied' | 'undetermined';
  } catch {
    return 'denied';
  }
}

async function cancelByIdentifier(prefix: string) {
  if (isExpoGo()) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith(prefix)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {}
}

async function scheduleNotification(
  identifier: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
  trigger: Notifications.NotificationTriggerInput,
  channelId?: string
) {
  if (isExpoGo()) return;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        data,
        sound: 'default',
        ...(Platform.OS === 'android' && channelId ? { channelId } : {}),
      },
      trigger,
    });
  } catch {}
}

export interface DARFLike {
  id: string;
  type: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  codigoReceita?: string;
}

export async function scheduleDARFNotifications(darfs: DARFLike[]) {
  if (Platform.OS === 'web' || isExpoGo()) return;
  await cancelByIdentifier('darf-');
  const unpaid = darfs.filter((d) => !d.paid);
  for (const darf of unpaid) {
    const due = new Date(darf.dueDate);
    const now = new Date();
    const daysUntilDue = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const amt = formatBRL(darf.amount);
    const dt = formatDate(darf.dueDate);
    if (daysUntilDue < 0) {
      await scheduleNotification(`darf-overdue-${darf.id}`, '⚠️ DARF Vencido!',
        `${darf.type} — ${amt} vencido em ${dt}. Regularize com multa e juros.`,
        { screen: '/(more)/ir', tab: 'darfs' }, null as unknown as Notifications.NotificationTriggerInput, 'finance-core');
    } else if (daysUntilDue <= 3) {
      const notifyAt = new Date(due); notifyAt.setHours(9, 0, 0, 0);
      if (notifyAt > now) {
        await scheduleNotification(`darf-soon-${darf.id}`, '📋 DARF vence em breve',
          `${darf.type} — ${amt} vence ${daysUntilDue === 0 ? 'hoje' : `em ${daysUntilDue} dia(s)`}.`,
          { screen: '/(more)/ir', tab: 'darfs' },
          { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notifyAt }, 'finance-core');
      }
    }
  }
}

export interface BudgetLike {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: 'monthly' | 'weekly';
}

export async function checkAndNotifyBudgets(budgets: BudgetLike[]) {
  if (Platform.OS === 'web' || isExpoGo()) return;
  await cancelByIdentifier('budget-');
  for (const budget of budgets) {
    const pct = budget.limit > 0 ? budget.spent / budget.limit : 0;
    if (pct >= 1.0) {
      await scheduleNotification(`budget-exceeded-${budget.id}`, '🔴 Orçamento estourado!',
        `${budget.category}: ${formatBRL(budget.spent)} de ${formatBRL(budget.limit)} (${Math.round(pct * 100)}%).`,
        { screen: '/(more)/budgets' }, null as unknown as Notifications.NotificationTriggerInput, 'budget-alerts');
    } else if (pct >= 0.8) {
      await scheduleNotification(`budget-warning-${budget.id}`, '🟡 Orçamento quase no limite',
        `${budget.category}: ${formatBRL(budget.spent)} de ${formatBRL(budget.limit)} (${Math.round(pct * 100)}%).`,
        { screen: '/(more)/budgets' }, null as unknown as Notifications.NotificationTriggerInput, 'budget-alerts');
    }
  }
}

export interface SubscriptionLike {
  id: string;
  name: string;
  amount: number;
  nextBillingDate: string;
  active: boolean;
}

export async function scheduleSubscriptionReminders(subscriptions: SubscriptionLike[]) {
  if (Platform.OS === 'web' || isExpoGo()) return;
  await cancelByIdentifier('sub-');
  const now = new Date();
  for (const sub of subscriptions.filter((s) => s.active)) {
    const billing = new Date(sub.nextBillingDate);
    const daysUntil = Math.floor((billing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0 && daysUntil <= 3) {
      const notifyAt = new Date(billing); notifyAt.setHours(9, 0, 0, 0);
      if (notifyAt > now) {
        await scheduleNotification(`sub-${sub.id}`, '💳 Assinatura a vencer',
          `${sub.name} — ${formatBRL(sub.amount)} será cobrado ${daysUntil === 0 ? 'hoje' : `em ${daysUntil} dia(s)`}.`,
          { screen: '/(more)/family' },
          { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notifyAt }, 'finance-core');
      }
    }
  }
}

export async function scheduleWeeklySummary(monthlyExpenses: number, monthlyIncome: number, netResult: number) {
  if (Platform.OS === 'web' || isExpoGo()) return;
  await cancelByIdentifier('weekly-');
  const now = new Date();
  const nextMonday = new Date(now);
  const day = nextMonday.getDay();
  nextMonday.setDate(nextMonday.getDate() + (day === 1 ? 7 : (8 - day) % 7));
  nextMonday.setHours(9, 0, 0, 0);
  const summaryLine = netResult >= 0
    ? `Saldo positivo de ${formatBRL(netResult)}. Continue assim! 💪`
    : `Saldo negativo de ${formatBRL(Math.abs(netResult))}. Revise seus gastos. 📊`;
  await scheduleNotification('weekly-summary-next', '📊 Resumo Semanal — Pilar Financeiro',
    `Receitas: ${formatBRL(monthlyIncome)} | Gastos: ${formatBRL(monthlyExpenses)} | ${summaryLine}`,
    { screen: '/(tabs)' },
    { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextMonday }, 'weekly-summary');
}

export async function cancelAllNotifications() {
  if (isExpoGo()) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  } catch {}
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
