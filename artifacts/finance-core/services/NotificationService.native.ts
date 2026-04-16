import { Platform } from 'react-native';
import Constants from 'expo-constants';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

async function getNotifs() {
  if (isExpoGo() || Platform.OS === 'web') return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

async function getDevice() {
  try {
    return await import('expo-device');
  } catch {
    return null;
  }
}

export async function initNotificationHandler() {
  if (isExpoGo() || Platform.OS === 'web') return;
  try {
    const Notifications = await getNotifs();
    if (!Notifications) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {}
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isExpoGo() || Platform.OS === 'web') return false;
  try {
    const [Notifications, Device] = await Promise.all([getNotifs(), getDevice()]);
    if (!Notifications) return false;
    if (!Device?.isDevice) return true;

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
  if (isExpoGo() || Platform.OS === 'web') return 'denied';
  try {
    const Notifications = await getNotifs();
    if (!Notifications) return 'denied';
    const { status } = await Notifications.getPermissionsAsync();
    return status as 'granted' | 'denied' | 'undetermined';
  } catch {
    return 'denied';
  }
}

async function cancelByIdentifier(prefix: string) {
  if (isExpoGo() || Platform.OS === 'web') return;
  try {
    const Notifications = await getNotifs();
    if (!Notifications) return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith(prefix)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
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
  if (isExpoGo() || Platform.OS === 'web') return;
  try {
    const Notifications = await getNotifs();
    if (!Notifications) return;
    await cancelByIdentifier('darf-');
    const unpaid = darfs.filter((d) => !d.paid);
    for (const darf of unpaid) {
      const due = new Date(darf.dueDate);
      const now = new Date();
      const days = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (days < 0) {
        await Notifications.scheduleNotificationAsync({
          identifier: `darf-overdue-${darf.id}`,
          content: {
            title: 'DARF Vencido!',
            body: `${darf.type} — ${formatBRL(darf.amount)} vencido em ${formatDate(darf.dueDate)}.`,
            data: { screen: '/(more)/ir' },
            sound: 'default',
            ...(Platform.OS === 'android' ? { channelId: 'finance-core' } : {}),
          },
          trigger: null,
        });
      }
    }
  } catch {}
}

export interface BudgetLike {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: 'monthly' | 'weekly';
}

export async function checkAndNotifyBudgets(budgets: BudgetLike[]) {
  if (isExpoGo() || Platform.OS === 'web') return;
  try {
    const Notifications = await getNotifs();
    if (!Notifications) return;
    await cancelByIdentifier('budget-');
    for (const budget of budgets) {
      const pct = budget.limit > 0 ? budget.spent / budget.limit : 0;
      if (pct >= 1.0) {
        await Notifications.scheduleNotificationAsync({
          identifier: `budget-exceeded-${budget.id}`,
          content: {
            title: 'Orcamento estourado!',
            body: `${budget.category}: ${Math.round(pct * 100)}% usado.`,
            data: { screen: '/(more)/budgets' },
            ...(Platform.OS === 'android' ? { channelId: 'budget-alerts' } : {}),
          },
          trigger: null,
        });
      }
    }
  } catch {}
}

export interface SubscriptionLike {
  id: string;
  name: string;
  amount: number;
  nextBillingDate: string;
  active: boolean;
}

export async function scheduleSubscriptionReminders(subscriptions: SubscriptionLike[]) {
  if (isExpoGo() || Platform.OS === 'web') return;
  try {
    const Notifications = await getNotifs();
    if (!Notifications) return;
    await cancelByIdentifier('sub-');
    const now = new Date();
    for (const sub of subscriptions.filter((s) => s.active)) {
      const billing = new Date(sub.nextBillingDate);
      const daysUntil = Math.floor((billing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil >= 0 && daysUntil <= 3) {
        const notifyAt = new Date(billing);
        notifyAt.setHours(9, 0, 0, 0);
        if (notifyAt > now) {
          await Notifications.scheduleNotificationAsync({
            identifier: `sub-${sub.id}`,
            content: {
              title: 'Assinatura a vencer',
              body: `${sub.name} — ${formatBRL(sub.amount)} em ${daysUntil === 0 ? 'hoje' : `${daysUntil} dia(s)`}.`,
              data: { screen: '/(more)/family' },
              ...(Platform.OS === 'android' ? { channelId: 'finance-core' } : {}),
            },
            trigger: { type: 'date' as any, date: notifyAt },
          });
        }
      }
    }
  } catch {}
}

export async function scheduleWeeklySummary(monthlyExpenses: number, monthlyIncome: number, netResult: number) {
  if (isExpoGo() || Platform.OS === 'web') return;
  try {
    const Notifications = await getNotifs();
    if (!Notifications) return;
    await cancelByIdentifier('weekly-');
    const now = new Date();
    const nextMonday = new Date(now);
    const day = nextMonday.getDay();
    nextMonday.setDate(nextMonday.getDate() + (day === 1 ? 7 : (8 - day) % 7));
    nextMonday.setHours(9, 0, 0, 0);
    const line = netResult >= 0
      ? `Saldo positivo de ${formatBRL(netResult)}.`
      : `Saldo negativo de ${formatBRL(Math.abs(netResult))}.`;
    await Notifications.scheduleNotificationAsync({
      identifier: 'weekly-summary-next',
      content: {
        title: 'Resumo Semanal — Pilar Financeiro',
        body: `Receitas: ${formatBRL(monthlyIncome)} | Gastos: ${formatBRL(monthlyExpenses)} | ${line}`,
        data: { screen: '/(tabs)' },
        ...(Platform.OS === 'android' ? { channelId: 'weekly-summary' } : {}),
      },
      trigger: { type: 'date' as any, date: nextMonday },
    });
  } catch {}
}

export async function cancelAllNotifications() {
  if (isExpoGo() || Platform.OS === 'web') return;
  try {
    const Notifications = await getNotifs();
    if (!Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  } catch {}
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}
