import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete, apiFetch } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountType = 'checking' | 'savings' | 'wallet' | 'investment' | 'credit';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  categoryId?: string;
  accountId: string;
  toAccountId?: string;
  date: string;
  installments?: number;
  currentInstallment?: number;
  totalInstallments?: number;
  recurring?: boolean;
  isFixed?: boolean;
  isPaid?: boolean;
  tags?: string[];
  notes?: string;
  attachmentUrl?: string;
  currency?: string;
  transferGroupId?: string;
  recurrenceType?: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  institution: string;
  color: string;
  archived?: boolean;
  creditLimit?: number;
}

export interface CreditCard {
  id: string;
  accountId: string;
  name: string;
  institution: string;
  brand: string;
  lastFourDigits?: string;
  limit: number;
  used: number;
  dueDate: string;
  closingDate: string;
  dueDay: number;
  closingDay: number;
  color: string;
  archived?: boolean;
}

export interface Investment {
  id: string;
  name: string;
  ticker: string;
  type: 'stocks' | 'fii' | 'reit' | 'fixed' | 'crypto' | 'etf';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currency: 'BRL' | 'USD';
  purchaseDate?: string;
  status?: string;
  institution?: string;
}

export interface Budget {
  id: string;
  category: string;
  categoryId?: string;
  limit: number;
  month: string;
}

export interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  icon: string;
  color: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  color: string | null;
  parentId: string | null;
  isDefault?: boolean;
  archived?: boolean;
}

export interface AppSettings {
  id?: string;
  currency: string;
  language: string;
  theme: string;
  emailNotifications: boolean;
  monthlyReports: boolean;
  budgetAlerts: boolean;
  billsEnabled?: boolean;
  sinkingFundsEnabled?: boolean;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  amount?: number;
  read: boolean;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

// ── Category Mapping ──────────────────────────────────────────────────────────

const NAME_TO_KEY: Record<string, string> = {
  salário: 'income', renda: 'income', 'outras receitas': 'income', receita: 'income',
  dividendo: 'income', proventos: 'income', 'renda extra': 'income',
  alimentação: 'food', mercado: 'food', restaurante: 'food', refeição: 'food', lanche: 'food',
  casa: 'housing', moradia: 'housing', aluguel: 'housing', água: 'housing',
  luz: 'housing', energia: 'housing', condomínio: 'housing', iptu: 'housing',
  internet: 'internet', telefone: 'internet', celular: 'internet',
  transporte: 'transport', carro: 'transport', combustível: 'transport',
  mecanica: 'transport', mecânica: 'transport', uber: 'transport', ônibus: 'transport',
  saúde: 'health', médico: 'health', farmácia: 'health', dentista: 'health', plano: 'health',
  educação: 'education', escola: 'education', curso: 'education', faculdade: 'education',
  entretenimento: 'entertainment', cinema: 'entertainment', streaming: 'entertainment',
  lazer: 'leisure', viagem: 'leisure', hobby: 'leisure',
  roupas: 'clothing', roupa: 'clothing', vestuário: 'clothing', calçado: 'clothing',
  investimento: 'investment', carteira: 'investment', aporte: 'investment',
  'outras despesas': 'other', outros: 'other', geral: 'other', diverso: 'other',
};

const KEY_TO_NAMES: Record<string, string[]> = {
  income: ['salário', 'renda', 'receita', 'outras receitas'],
  food: ['alimentação', 'mercado', 'comida'],
  housing: ['casa', 'moradia', 'aluguel', 'água', 'luz'],
  internet: ['internet', 'telefone'],
  transport: ['transporte', 'carro', 'combustível'],
  health: ['saúde', 'médico', 'farmácia'],
  education: ['educação', 'escola', 'curso'],
  entertainment: ['entretenimento', 'cinema', 'lazer'],
  leisure: ['lazer', 'viagem', 'hobby'],
  clothing: ['roupas', 'roupa', 'vestuário'],
  investment: ['investimento', 'aporte'],
  other: ['outras despesas', 'outros', 'geral'],
};

function catNameToKey(name: string): string {
  const lower = name.toLowerCase().trim();
  return NAME_TO_KEY[lower] || 'other';
}

function findCategoryId(
  categories: ApiCategory[],
  key: string,
  type: 'income' | 'expense'
): string | undefined {
  if (type === 'income' || key === 'income') {
    return categories.find((c) => c.type === 'income')?.id;
  }
  const patterns = KEY_TO_NAMES[key] || [key];
  const found = categories.find(
    (c) => c.type === 'expense' && patterns.some((p) => c.name.toLowerCase().includes(p))
  );
  return found?.id || categories.find((c) => c.type === 'expense')?.id;
}

// ── Transform helpers ─────────────────────────────────────────────────────────

function parseDate(d: string | null | undefined): string {
  if (!d) return new Date().toISOString().split('T')[0];
  return d.split('T')[0];
}

function goalColor(name: string): string {
  const colors = ['#0096C7', '#2ED573', '#FF6B6B', '#A29BFE', '#FD9644', '#00B894', '#6C5CE7', '#FDCB6E'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

function transformTransaction(raw: Record<string, unknown>, catMap: Record<string, ApiCategory>): Transaction {
  const cat = catMap[raw.categoryId as string];
  const categoryKey = cat
    ? (cat.type === 'income' ? 'income' : catNameToKey(cat.name))
    : (raw.type === 'income' ? 'income' : 'other');
  return {
    id: raw.id as string,
    description: raw.description as string,
    amount: Math.abs(parseFloat(raw.amount as string)),
    type: raw.type as TransactionType,
    category: categoryKey,
    categoryId: raw.categoryId as string | undefined,
    accountId: raw.accountId as string,
    toAccountId: (raw.toAccountId as string) || undefined,
    date: parseDate(raw.date as string),
    currentInstallment: raw.installmentNumber ? Number(raw.installmentNumber) : undefined,
    totalInstallments: raw.totalInstallments ? Number(raw.totalInstallments) : undefined,
    installments: raw.totalInstallments && Number(raw.totalInstallments) > 1 ? Number(raw.totalInstallments) : undefined,
    recurring: (raw.isRecurring as boolean) || false,
    isFixed: raw.isFixed as boolean,
    isPaid: raw.isPaid as boolean,
    tags: (raw.tags as string[]) || [],
    notes: (raw.notes as string) || undefined,
    attachmentUrl: (raw.attachmentUrl as string) || undefined,
    currency: (raw.currency as string) || 'BRL',
    transferGroupId: (raw.transferGroupId as string) || undefined,
    recurrenceType: (raw.recurrenceType as string) || null,
  };
}

function transformAccount(raw: Record<string, unknown>): Account {
  let type = (raw.type as string) as AccountType;
  if (type === 'wallet') type = 'savings';
  return {
    id: raw.id as string,
    name: raw.name as string,
    type,
    balance: parseFloat(raw.balance as string) || 0,
    institution: (raw.institution as string) || '',
    color: (raw.color as string) || '#0096C7',
    archived: (raw.archived as boolean) || false,
    creditLimit: raw.creditLimit ? parseFloat(raw.creditLimit as string) : undefined,
  };
}

/**
 * Returns the billing period {start, end} for a given displayMonth ("YYYY-MM") and closingDay.
 * e.g. closingDay=5, displayMonth="2026-03" → { start:"2026-02-06", end:"2026-03-05" }
 */
function getBillingPeriod(closingDay: number, displayMonth: string): { start: string; end: string } {
  const [y, m] = displayMonth.split('-').map(Number);
  const endDate = new Date(y, m - 1, closingDay);
  const startDate = new Date(y, m - 2, closingDay + 1);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(startDate), end: fmt(endDate) };
}

/**
 * Returns the display month ("YYYY-MM") for the current open invoice given closingDay and today.
 * If today > closingDay: the open invoice belongs to NEXT month's label
 * If today <= closingDay: the open invoice belongs to THIS month's label
 */
function getCurrentInvoiceMonth(closingDay: number, now: Date): string {
  const d = now.getDate();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (d > closingDay) {
    // after this month's closing → open invoice shows as next month
    const next = new Date(y, m, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

function transformCard(raw: Record<string, unknown>, transactions: Transaction[]): CreditCard {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const closingDay = Number(raw.closingDay) || 1;
  const dueDay = Number(raw.dueDay) || 10;
  const formatDay = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Compute used from the CURRENT OPEN billing cycle, not all-time
  const openInvoiceMonth = getCurrentInvoiceMonth(closingDay, now);
  const { start: billingStart, end: billingEnd } = getBillingPeriod(closingDay, openInvoiceMonth);
  const used = transactions
    .filter((t) => {
      if (t.accountId !== (raw.accountId as string)) return false;
      if (t.type !== 'expense') return false;
      return t.date >= billingStart && t.date <= billingEnd;
    })
    .reduce((s, t) => s + t.amount, 0);
  return {
    id: raw.id as string,
    accountId: (raw.accountId as string) || '',
    name: raw.name as string,
    institution: (raw.brand as string) || 'Cartão',
    brand: (raw.brand as string) || '',
    lastFourDigits: (raw.lastFourDigits as string) || undefined,
    limit: parseFloat(raw.creditLimit as string) || 0,
    used,
    dueDate: formatDay(dueDay),
    closingDate: formatDay(closingDay),
    dueDay,
    closingDay,
    color: (raw.color as string) || '#0096C7',
    archived: (raw.archived as boolean) || false,
  };
}

function transformInvestment(raw: Record<string, unknown>): Investment {
  const type = (raw.type as string) as Investment['type'];
  return {
    id: raw.id as string,
    name: (raw.name as string) || (raw.ticker as string) || '',
    ticker: (raw.ticker as string) || '',
    type,
    quantity: parseFloat(raw.quantity as string) || 0,
    avgPrice: parseFloat((raw.purchasePrice || raw.averagePrice) as string) || 0,
    currentPrice: parseFloat(raw.currentPrice as string) || 0,
    currency: 'BRL',
    purchaseDate: raw.purchaseDate ? parseDate(raw.purchaseDate as string) : undefined,
    status: (raw.status as string) || 'active',
    institution: (raw.institution as string) || undefined,
  };
}

function transformBudget(raw: Record<string, unknown>, catMap: Record<string, ApiCategory>): Budget {
  const cat = catMap[raw.categoryId as string];
  const categoryKey = cat ? catNameToKey(cat.name) : 'other';
  const month = Number(raw.month);
  const year = Number(raw.year);
  return {
    id: raw.id as string,
    category: categoryKey,
    categoryId: raw.categoryId as string,
    limit: parseFloat(raw.amount as string) || 0,
    month: `${year}-${String(month).padStart(2, '0')}`,
  };
}

function transformGoal(raw: Record<string, unknown>): Goal {
  const name = raw.name as string;
  return {
    id: raw.id as string,
    name,
    description: (raw.description as string) || undefined,
    targetAmount: parseFloat(raw.targetAmount as string) || 0,
    currentAmount: parseFloat(raw.currentAmount as string) || 0,
    deadline: parseDate(raw.deadline as string),
    icon: (raw.icon as string) || 'target',
    color: (raw.color as string) || goalColor(name),
  };
}

/**
 * Computes the net movement of transactions for a given account:
 * income - expense - transferOut + transferIn
 */
function computeTxNet(accountId: string, txs: Transaction[]): number {
  return txs.reduce((net, t) => {
    if (t.accountId === accountId) {
      if (t.type === 'income') return net + t.amount;
      if (t.type === 'expense') return net - t.amount;
      if (t.type === 'transfer') return net - t.amount;
    }
    if (t.toAccountId === accountId && t.type === 'transfer') return net + t.amount;
    return net;
  }, 0);
}

function transformSettings(raw: Record<string, unknown>): AppSettings {
  return {
    id: raw.id as string,
    currency: (raw.currency as string) || 'BRL',
    language: (raw.language as string) || 'pt-BR',
    theme: (raw.theme as string) || 'system',
    emailNotifications: (raw.emailNotifications as boolean) ?? true,
    monthlyReports: (raw.monthlyReports as boolean) ?? true,
    budgetAlerts: (raw.budgetAlerts as boolean) ?? true,
    billsEnabled: (raw.billsEnabled as boolean) ?? false,
    sinkingFundsEnabled: (raw.sinkingFundsEnabled as boolean) ?? false,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

interface FinanceContextType {
  transactions: Transaction[];
  accounts: Account[];
  creditCards: CreditCard[];
  investments: Investment[];
  budgets: Budget[];
  goals: Goal[];
  categories: ApiCategory[];
  tags: Tag[];
  notifications: AppNotification[];
  settings: AppSettings | null;
  isLoading: boolean;

  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addTransfer: (fromAccountId: string, toAccountId: string, amount: number, description: string, date: string) => Promise<void>;

  addAccount: (a: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: string, a: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  addCreditCard: (c: Omit<CreditCard, 'id' | 'used'>) => Promise<void>;
  updateCreditCard: (id: string, c: Partial<CreditCard>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;
  addCardExpense: (cardId: string, t: Omit<Transaction, 'id'>) => void;
  payCardInvoice: (cardId: string, amount: number, accountId: string) => void;
  advanceInstallment: (transactionId: string) => void;
  getCardTransactions: (cardId: string, month?: string) => Transaction[];

  addInvestment: (i: Omit<Investment, 'id'>) => Promise<void>;
  updateInvestment: (id: string, i: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;

  addGoal: (g: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, g: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addContribution: (goalId: string, amount: number) => Promise<void>;

  addBudget: (b: Omit<Budget, 'id'>) => Promise<void>;
  updateBudget: (id: string, b: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  addCategory: (c: Omit<ApiCategory, 'id'>) => Promise<void>;
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  dismissNotification: (id: string) => void;

  refresh: () => Promise<void>;

  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  prevMonthIncome: number;
  prevMonthExpenses: number;
  netResult: number;
  healthScore: number;
}

const FinanceContext = createContext<FinanceContextType | null>(null);
const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

// ── Provider ──────────────────────────────────────────────────────────────────

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const catMapRef = useRef<Record<string, ApiCategory>>({});
  const openingBalancesRef = useRef<Record<string, number>>({});

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cats, accs, txs, invs, buds, gls, cards, tagList, notifs, settingsRaw] = await Promise.allSettled([
        apiGet<ApiCategory[]>('/api/categories'),
        apiGet<Record<string, unknown>[]>('/api/accounts'),
        apiGet<Record<string, unknown>[]>('/api/transactions'),
        apiGet<Record<string, unknown>[]>('/api/investments'),
        apiGet<Record<string, unknown>[]>('/api/budgets'),
        apiGet<Record<string, unknown>[]>('/api/goals'),
        apiGet<Record<string, unknown>[]>('/api/cards'),
        apiGet<Tag[]>('/api/tags'),
        apiGet<AppNotification[]>('/api/notifications'),
        apiGet<Record<string, unknown>>('/api/settings'),
      ]);

      const catList = cats.status === 'fulfilled' ? cats.value : [];
      const catMap: Record<string, ApiCategory> = {};
      catList.forEach((c) => { catMap[c.id] = c; });
      catMapRef.current = catMap;
      setCategories(catList);

      const accsData = accs.status === 'fulfilled' ? accs.value : [];
      const mappedAccounts = accsData.map(transformAccount);
      setAccounts(mappedAccounts);

      const txsData = txs.status === 'fulfilled' ? txs.value : [];
      const mappedTx = txsData.map((r) => transformTransaction(r, catMap));
      setTransactions(mappedTx);

      // Compute opening balances (balance before any loaded transactions).
      // openingBalance = api.balance - txNet, so that
      // computedBalance = openingBalance + currentTxNet always reflects local state.
      const newOpeningBalances: Record<string, number> = {};
      mappedAccounts.forEach((acc) => {
        const txNet = computeTxNet(acc.id, mappedTx);
        newOpeningBalances[acc.id] = acc.balance - txNet;
      });
      openingBalancesRef.current = newOpeningBalances;

      const cardsData = cards.status === 'fulfilled' ? cards.value : [];
      const mappedCards = cardsData.map((r) => transformCard(r, mappedTx));
      setCreditCards(mappedCards);

      const invsData = invs.status === 'fulfilled' ? invs.value : [];
      setInvestments(invsData.map(transformInvestment));

      const budsData = buds.status === 'fulfilled' ? buds.value : [];
      setBudgets(budsData.map((r) => transformBudget(r, catMap)));

      const glsData = gls.status === 'fulfilled' ? gls.value : [];
      setGoals(glsData.map(transformGoal));

      if (tagList.status === 'fulfilled') setTags(tagList.value || []);
      if (notifs.status === 'fulfilled') setNotifications(notifs.value || []);
      if (settingsRaw.status === 'fulfilled' && settingsRaw.value && settingsRaw.value.id) {
        setSettings(transformSettings(settingsRaw.value));
      }
    } catch (e) {
      console.warn('[FinanceContext] loadAll error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAll();
    } else {
      setTransactions([]);
      setAccounts([]);
      setCreditCards([]);
      setInvestments([]);
      setBudgets([]);
      setGoals([]);
      setCategories([]);
      setTags([]);
      setNotifications([]);
      setSettings(null);
      catMapRef.current = {};
      setIsLoading(false);
    }
  }, [isAuthenticated, loadAll]);

  // ── Computed ───────────────────────────────────────────────────────────────

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const monthlyTx = transactions.filter((t) => t.date.startsWith(currentMonth));
  const prevMonthTx = transactions.filter((t) => t.date.startsWith(prevMonth));
  // Recompute account balances from local transactions so any optimistic update
  // (add/delete transaction) is instantly reflected without waiting for an API refresh.
  // openingBalance (captured once after loadAll) + currentTxNet = live balance.
  const computedAccounts = useMemo(() => {
    return accounts.map((acc) => {
      const opening = openingBalancesRef.current[acc.id];
      if (opening === undefined) return acc;
      const txNet = computeTxNet(acc.id, transactions);
      return { ...acc, balance: opening + txNet };
    });
  }, [accounts, transactions]);

  const totalBalance = computedAccounts.filter((a) => !a.archived && a.type !== 'credit').reduce((s, a) => s + a.balance, 0);
  const monthlyIncome = monthlyTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = monthlyTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const prevMonthIncome = prevMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevMonthExpenses = prevMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netResult = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? Math.max(0, netResult / monthlyIncome) : 0;
  const healthScore = Math.min(100, Math.round(savingsRate * 100));

  // ── Transactions ───────────────────────────────────────────────────────────

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
    const cats = Object.values(catMapRef.current);
    const categoryId = t.categoryId || findCategoryId(cats, t.category, t.type === 'transfer' ? 'expense' : t.type as 'income' | 'expense');
    const body = {
      description: t.description,
      amount: t.amount,
      type: t.type,
      date: t.date,
      accountId: t.accountId,
      categoryId,
      toAccountId: t.toAccountId || undefined,
      isPaid: t.isPaid ?? true,
      isFixed: t.recurring || t.isFixed || false,
      isRecurring: t.recurring || false,
      notes: t.notes || null,
      tags: t.tags || [],
      totalInstallments: t.installments && t.installments > 1 ? t.installments : 1,
      currency: t.currency || 'BRL',
    };
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/transactions', body);
      const newTx = transformTransaction(raw, catMapRef.current);
      setTransactions((prev) => [newTx, ...prev]);
      if (raw.accountId) {
        const updatedAcc = await apiGet<Record<string, unknown>>(`/api/accounts`);
        if (Array.isArray(updatedAcc)) {
          setAccounts((updatedAcc as Record<string, unknown>[]).map(transformAccount));
        }
      }
    } catch (e) {
      console.warn('[addTransaction] API error:', e);
      const optimistic: Transaction = { ...t, id: uid() };
      setTransactions((prev) => [optimistic, ...prev]);
    }
  }, []);

  const updateTransaction = useCallback(async (id: string, t: Partial<Transaction>) => {
    setTransactions((prev) => prev.map((item) => item.id === id ? { ...item, ...t } : item));
    try {
      await apiPatch(`/api/transactions/${id}`, {
        description: t.description,
        amount: t.amount,
        type: t.type,
        date: t.date,
        accountId: t.accountId,
        toAccountId: t.toAccountId,
        categoryId: t.categoryId,
        notes: t.notes,
        tags: t.tags,
        isPaid: t.isPaid,
        isFixed: t.isFixed,
        isRecurring: t.recurring,
      });
    } catch (e) { console.warn('[updateTransaction]', e); }
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    setTransactions((prev) => prev.filter((item) => item.id !== id));
    try {
      await apiDelete(`/api/transactions/${id}`);
      const updatedAcc = await apiGet<Record<string, unknown>[]>('/api/accounts');
      if (Array.isArray(updatedAcc)) setAccounts(updatedAcc.map(transformAccount));
    } catch {}
  }, []);

  const addTransfer = useCallback(async (
    fromAccountId: string, toAccountId: string, amount: number, description: string, date: string
  ) => {
    const body = {
      description, amount, type: 'transfer', date,
      accountId: fromAccountId, toAccountId,
      categoryId: Object.values(catMapRef.current).find((c) => c.type === 'expense')?.id,
      isPaid: true,
    };
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/transactions', body);
      const newTx = transformTransaction(raw, catMapRef.current);
      setTransactions((prev) => [newTx, ...prev]);
      const updatedAcc = await apiGet<Record<string, unknown>[]>('/api/accounts');
      if (Array.isArray(updatedAcc)) setAccounts(updatedAcc.map(transformAccount));
    } catch {
      const optimistic: Transaction = {
        id: uid(), description, amount, type: 'transfer',
        category: 'transfer', accountId: fromAccountId, toAccountId, date,
      };
      setTransactions((prev) => [optimistic, ...prev]);
    }
  }, []);

  // ── Accounts ───────────────────────────────────────────────────────────────

  const addAccount = useCallback(async (a: Omit<Account, 'id'>) => {
    const body = {
      name: a.name,
      type: a.type === 'savings' ? 'savings' : a.type,
      institution: a.institution,
      balance: a.balance,
      color: a.color,
      creditLimit: a.creditLimit || undefined,
    };
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/accounts', body);
      const newAcc = transformAccount(raw);
      // Opening balance = initial balance (no transactions exist for this account yet)
      openingBalancesRef.current[newAcc.id] = newAcc.balance;
      setAccounts((prev) => [...prev, newAcc]);
    } catch (e) {
      console.warn('[addAccount]', e);
      const fallbackAcc = { ...a, id: uid() };
      openingBalancesRef.current[fallbackAcc.id] = fallbackAcc.balance;
      setAccounts((prev) => [...prev, fallbackAcc]);
    }
  }, []);

  const updateAccount = useCallback(async (id: string, a: Partial<Account>) => {
    setAccounts((prev) => prev.map((item) => item.id === id ? { ...item, ...a } : item));
    try {
      await apiPatch(`/api/accounts/${id}`, {
        name: a.name,
        type: a.type,
        institution: a.institution,
        color: a.color,
        archived: a.archived,
        creditLimit: a.creditLimit,
      });
    } catch {}
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    setAccounts((prev) => prev.filter((item) => item.id !== id));
    try { await apiDelete(`/api/accounts/${id}`); } catch {}
  }, []);

  // ── Credit Cards ───────────────────────────────────────────────────────────

  const addCreditCard = useCallback(async (c: Omit<CreditCard, 'id' | 'used'>) => {
    const body = {
      name: c.name,
      brand: c.brand || c.institution,
      lastFourDigits: c.lastFourDigits,
      creditLimit: c.limit,
      closingDay: c.closingDay,
      dueDay: c.dueDay,
      color: c.color,
      accountId: c.accountId || undefined,
    };
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/cards', body);
      const mapped = transformCard(raw, transactions);
      setCreditCards((prev) => [...prev, mapped]);
    } catch (e) {
      console.warn('[addCreditCard]', e);
      setCreditCards((prev) => [...prev, { ...c, id: uid(), used: 0 }]);
    }
  }, [transactions]);

  const updateCreditCard = useCallback(async (id: string, c: Partial<CreditCard>) => {
    setCreditCards((prev) => prev.map((item) => item.id === id ? { ...item, ...c } : item));
    try {
      await apiPatch(`/api/cards/${id}`, {
        name: c.name,
        creditLimit: c.limit,
        closingDay: c.closingDay,
        dueDay: c.dueDay,
        color: c.color,
        archived: c.archived,
      });
    } catch {}
  }, []);

  const deleteCreditCard = useCallback(async (id: string) => {
    setCreditCards((prev) => prev.filter((item) => item.id !== id));
    try { await apiDelete(`/api/cards/${id}`); } catch {}
  }, []);

  const addCardExpense = useCallback((cardId: string, t: Omit<Transaction, 'id'>) => {
    const card = creditCards.find((c) => c.id === cardId);
    if (!card) return;
    addTransaction({ ...t, accountId: card.accountId });
  }, [creditCards, addTransaction]);

  const payCardInvoice = useCallback((cardId: string, amount: number, accountId: string) => {
    const card = creditCards.find((c) => c.id === cardId);
    if (!card) return;
    addTransfer(accountId, card.accountId, amount, `Pagamento fatura ${card.name}`, new Date().toISOString().split('T')[0]);
  }, [creditCards, addTransfer]);

  const advanceInstallment = useCallback((transactionId: string) => {
    setTransactions((prev) => prev.map((t) => {
      if (t.id !== transactionId || !t.currentInstallment || !t.totalInstallments) return t;
      return { ...t, currentInstallment: Math.min(t.currentInstallment + 1, t.totalInstallments) };
    }));
  }, []);

  const getCardTransactions = useCallback((cardId: string, month?: string) => {
    const card = creditCards.find((c) => c.id === cardId);
    if (!card) return [];
    return transactions.filter((t) => {
      if (t.accountId !== card.accountId) return false;
      if (t.type === 'transfer') return false;
      if (month) {
        // Use billing cycle dates instead of calendar month
        const { start, end } = getBillingPeriod(card.closingDay, month);
        return t.date >= start && t.date <= end;
      }
      return true;
    });
  }, [creditCards, transactions]);

  // ── Investments ────────────────────────────────────────────────────────────

  const addInvestment = useCallback(async (i: Omit<Investment, 'id'>) => {
    const body = {
      name: i.name,
      ticker: i.ticker,
      type: i.type,
      quantity: i.quantity,
      purchasePrice: i.avgPrice,
      currentPrice: i.currentPrice,
      purchaseDate: i.purchaseDate || new Date().toISOString().split('T')[0],
      status: 'active',
      institution: i.institution,
    };
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/investments', body);
      setInvestments((prev) => [...prev, transformInvestment(raw)]);
    } catch (e) {
      console.warn('[addInvestment]', e);
      setInvestments((prev) => [...prev, { ...i, id: uid() }]);
    }
  }, []);

  const updateInvestment = useCallback(async (id: string, i: Partial<Investment>) => {
    setInvestments((prev) => prev.map((item) => item.id === id ? { ...item, ...i } : item));
    try {
      await apiPatch(`/api/investments/${id}`, {
        currentPrice: i.currentPrice,
        quantity: i.quantity,
        name: i.name,
        purchasePrice: i.avgPrice,
        institution: i.institution,
      });
    } catch {}
  }, []);

  const deleteInvestment = useCallback(async (id: string) => {
    setInvestments((prev) => prev.filter((item) => item.id !== id));
    try { await apiDelete(`/api/investments/${id}`); } catch {}
  }, []);

  // ── Goals ──────────────────────────────────────────────────────────────────

  const addGoal = useCallback(async (g: Omit<Goal, 'id'>) => {
    const body = {
      name: g.name,
      description: g.description || null,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount || 0,
      deadline: g.deadline,
      icon: g.icon || 'target',
    };
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/goals', body);
      setGoals((prev) => [...prev, transformGoal(raw)]);
    } catch (e) {
      console.warn('[addGoal]', e);
      setGoals((prev) => [...prev, { ...g, id: uid() }]);
    }
  }, []);

  const updateGoal = useCallback(async (id: string, g: Partial<Goal>) => {
    setGoals((prev) => prev.map((item) => item.id === id ? { ...item, ...g } : item));
    try {
      await apiPatch(`/api/goals/${id}`, {
        name: g.name,
        description: g.description,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        deadline: g.deadline,
        icon: g.icon,
      });
    } catch {}
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    setGoals((prev) => prev.filter((item) => item.id !== id));
    try { await apiDelete(`/api/goals/${id}`); } catch {}
  }, []);

  const addContribution = useCallback(async (goalId: string, amount: number) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
    setGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, currentAmount: newAmount } : g));
    try {
      const res = await apiFetch(`/api/goals/${goalId}/contribute`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const raw = await res.json().catch(() => null);
        if (raw && raw.currentAmount !== undefined) {
          setGoals((prev) => prev.map((g) => g.id === goalId
            ? { ...g, currentAmount: parseFloat(raw.currentAmount) }
            : g
          ));
        }
      } else {
        await apiPatch(`/api/goals/${goalId}`, { currentAmount: newAmount });
      }
    } catch {
      try { await apiPatch(`/api/goals/${goalId}`, { currentAmount: newAmount }); } catch {}
    }
  }, [goals]);

  // ── Budgets ────────────────────────────────────────────────────────────────

  const addBudget = useCallback(async (b: Omit<Budget, 'id'>) => {
    const cats = Object.values(catMapRef.current);
    const categoryId = b.categoryId || findCategoryId(cats, b.category, 'expense');
    const [year, month] = b.month.split('-');
    const body = {
      categoryId,
      amount: b.limit,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
    };
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/budgets', body);
      setBudgets((prev) => [...prev, transformBudget(raw, catMapRef.current)]);
    } catch (e) {
      console.warn('[addBudget]', e);
      setBudgets((prev) => [...prev, { ...b, id: uid() }]);
    }
  }, []);

  const updateBudget = useCallback(async (id: string, b: Partial<Budget>) => {
    setBudgets((prev) => prev.map((item) => item.id === id ? { ...item, ...b } : item));
    try {
      await apiPatch(`/api/budgets/${id}`, { amount: b.limit });
    } catch {}
  }, []);

  const deleteBudget = useCallback(async (id: string) => {
    setBudgets((prev) => prev.filter((item) => item.id !== id));
    try { await apiDelete(`/api/budgets/${id}`); } catch {}
  }, []);

  // ── Categories ─────────────────────────────────────────────────────────────

  const addCategory = useCallback(async (c: Omit<ApiCategory, 'id'>) => {
    try {
      const raw = await apiPost<ApiCategory>('/api/categories', {
        name: c.name,
        type: c.type,
        icon: c.icon || 'Tag',
        color: c.color || '#0096C7',
        parentId: c.parentId || null,
      });
      setCategories((prev) => [...prev, raw]);
      catMapRef.current[raw.id] = raw;
    } catch (e) { console.warn('[addCategory]', e); }
  }, []);

  // ── Settings ───────────────────────────────────────────────────────────────

  const updateSettings = useCallback(async (s: Partial<AppSettings>) => {
    setSettings((prev) => prev ? { ...prev, ...s } : s as AppSettings);
    try {
      const raw = await apiPatch<Record<string, unknown>>('/api/settings', s);
      if (raw && raw.id) setSettings(transformSettings(raw));
    } catch {}
  }, []);

  // ── Notifications ──────────────────────────────────────────────────────────

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    try { await apiPatch(`/api/notifications/${id}`, { read: true }); } catch {}
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Refresh ────────────────────────────────────────────────────────────────

  const refresh = useCallback(() => loadAll(), [loadAll]);

  return (
    <FinanceContext.Provider value={{
      transactions, accounts: computedAccounts, creditCards, investments, budgets, goals,
      categories, tags, notifications, settings, isLoading,
      addTransaction, updateTransaction, deleteTransaction, addTransfer,
      addAccount, updateAccount, deleteAccount,
      addCreditCard, updateCreditCard, deleteCreditCard,
      addCardExpense, payCardInvoice, advanceInstallment, getCardTransactions,
      addInvestment, updateInvestment, deleteInvestment,
      addGoal, updateGoal, deleteGoal, addContribution,
      addBudget, updateBudget, deleteBudget,
      addCategory, updateSettings, markNotificationRead, dismissNotification,
      refresh,
      totalBalance, monthlyIncome, monthlyExpenses, prevMonthIncome, prevMonthExpenses, netResult, healthScore,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
