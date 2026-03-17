// Web stub — expo-notifications is not available on web
export async function requestNotificationPermissions(): Promise<boolean> { return false; }
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> { return 'denied'; }
export async function scheduleDARFNotifications(_darfs: any[]): Promise<void> {}
export async function checkAndNotifyBudgets(_budgets: any[]): Promise<void> {}
export async function scheduleWeeklySummary(_exp: number, _inc: number, _net: number): Promise<void> {}
export async function scheduleSubscriptionReminders(_subs: any[]): Promise<void> {}
export async function cancelAllNotifications(): Promise<void> {}

export interface DARFLike { id: string; type: string; amount: number; dueDate: string; paid: boolean; codigoReceita?: string; }
export interface BudgetLike { id: string; category: string; limit: number; spent: number; period: 'monthly' | 'weekly'; }
export interface SubscriptionLike { id: string; name: string; amount: number; nextBillingDate: string; active: boolean; }
