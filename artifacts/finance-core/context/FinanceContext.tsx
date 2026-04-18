import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete, apiFetch } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import { parseAmount, parseDate as parseDateSafe } from '@/utils/parse';
import { logger } from '@/utils/logger';
import { notifyError } from '@/utils/notify';

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
  transactionDate?: string;
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
  creditCardId?: string;
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
  usedPosted?: number;
  usedPending?: number;
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

// Local wrapper kept for backwards compatibility — delegates to the shared utility.
function parseDate(d: unknown): string {
  return parseDateSafe(d);
}

const INVESTMENT_TYPES = ['stocks', 'fii', 'reit', 'etf', 'crypto', 'fixed'] as const;
type InvestmentType = typeof INVESTMENT_TYPES[number];

function normalizeInvestmentType(raw: unknown): InvestmentType {
  if (typeof raw !== 'string') return 'fixed';
  const lower = raw.trim().toLowerCase();
  // Aceita variações comuns que vêm do backend.
  const map: Record<string, InvestmentType> = {
    stock: 'stocks', stocks: 'stocks', acao: 'stocks', acoes: 'stocks',
    fii: 'fii', fund: 'fii',
    reit: 'reit',
    etf: 'etf',
    crypto: 'crypto', cripto: 'crypto',
    fixed: 'fixed', fixed_income: 'fixed', renda_fixa: 'fixed', cdb: 'fixed', tesouro: 'fixed',
  };
  return map[lower] ?? 'fixed';
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
    amount: Math.abs(parseAmount(raw.amount)),
    type: raw.type as TransactionType,
    category: categoryKey,
    categoryId: raw.categoryId as string | undefined,
    accountId: raw.accountId as string,
    toAccountId: (raw.toAccountId as string) || undefined,
    date: parseDate(raw.date as string),
    transactionDate: raw.transactionDate ? parseDate(raw.transactionDate as string) : undefined,
    creditCardId: (raw.creditCardId as string) || (raw.cardId as string) || undefined,
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
  const balanceRaw = raw.computedBalance ?? raw.balance;
  return {
    id: raw.id as string,
    name: raw.name as string,
    type,
    balance: parseAmount(balanceRaw),
    institution: (raw.institution as string) || '',
    color: (raw.color as string) || '#0096C7',
    archived: (raw.archived as boolean) || false,
    creditLimit: raw.creditLimit !== undefined && raw.creditLimit !== null ? parseAmount(raw.creditLimit) : undefined,
  };
}

/**
 * Returns the billing period {start, end} for a given displayMonth ("YYYY-MM") and closingDay.
 * e.g. closingDay=5, displayMonth="2026-03" → { start:"2026-02-06", end:"2026-03-05" }
 */
export function getBillingPeriod(closingDay: number, displayMonth: string): { start: string; end: string } {
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
export function getCurrentInvoiceMonth(closingDay: number, now: Date): string {
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

export function isInvoicePayment(t: Transaction): boolean {
  const d = (t.description || '').toLowerCase();
  return d.startsWith('pagamento de fatura') || d.startsWith('pagamento fatura');
}

function transformCard(raw: Record<string, unknown>, transactions: Transaction[]): CreditCard {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const closingDay = Number(raw.closingDay) || 1;
  const dueDay = Number(raw.dueDay) || 10;
  const formatDay = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Prefer backend-provided invoice when present, else compute locally.
  const backendInvoice = raw.currentInvoice ?? raw.invoiceTotal ?? raw.currentBalance;

  // Compute used from the CURRENT OPEN billing cycle, not all-time.
  // Exclude invoice payments (they're recorded as expenses on the card account
  // but represent payments, not new charges).
  const openInvoiceMonth = getCurrentInvoiceMonth(closingDay, now);
  const { start: billingStart, end: billingEnd } = getBillingPeriod(closingDay, openInvoiceMonth);
  const cardId = raw.id as string;
  const anyHasCardId = transactions.some((t) => t.creditCardId);
  const computedUsed = transactions
    .filter((t) => {
      if (anyHasCardId) {
        if (t.creditCardId !== cardId) return false;
      } else {
        if (t.accountId !== (raw.accountId as string)) return false;
      }
      if (t.type !== 'expense') return false;
      if (isInvoicePayment(t)) return false;
      const desc = (t.description || '').toLowerCase();
      if (desc.startsWith('transferência') || desc.startsWith('transferencia')) return false;
      return t.date >= billingStart && t.date <= billingEnd;
    })
    .reduce((s, t) => s + t.amount, 0);

  const used = backendInvoice !== undefined && backendInvoice !== null
    ? Math.abs(parseAmount(backendInvoice))
    : computedUsed;
  return {
    id: raw.id as string,
    accountId: (raw.accountId as string) || '',
    name: raw.name as string,
    institution: (raw.brand as string) || 'Cartão',
    brand: (raw.brand as string) || '',
    lastFourDigits: (raw.lastFourDigits as string) || undefined,
    limit: parseAmount(raw.creditLimit),
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
  return {
    id: raw.id as string,
    name: (raw.name as string) || (raw.ticker as string) || '',
    ticker: (raw.ticker as string) || '',
    type: normalizeInvestmentType(raw.type),
    quantity: parseAmount(raw.quantity),
    avgPrice: parseAmount(raw.purchasePrice ?? raw.averagePrice),
    currentPrice: parseAmount(raw.currentPrice),
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
    limit: parseAmount(raw.amount),
    month: `${year}-${String(month).padStart(2, '0')}`,
  };
}

function transformGoal(raw: Record<string, unknown>): Goal {
  const name = raw.name as string;
  return {
    id: raw.id as string,
    name,
    description: (raw.description as string) || undefined,
    targetAmount: parseAmount(raw.targetAmount),
    currentAmount: parseAmount(raw.currentAmount),
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
    // Pending transactions don't affect the balance (matches backend behavior).
    if (t.isPaid === false) return net;
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
  cashBalance: number;
  netWorth: number;
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

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'transactions', 'accounts',
      'investments', 'budgets', 'goals', 'categories', 'cards', 'tags', 'notifications']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { isUnlocked, isAuthenticated: _isAuth } = useAuth();
  const isAuthenticated = isUnlocked;
  const { selectedWalletId, isReady: walletReady } = useWallet();

  const wq = useCallback((path: string) => {
    if (!selectedWalletId) return path;
    const sep = path.includes('?') ? '&' : '?';
    return `${path}${sep}walletId=${selectedWalletId}`;
  }, [selectedWalletId]);

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
  const transactionsRef = useRef<Transaction[]>([]);

  /**
   * Call this whenever accounts are refreshed from the API.
   * Recalibrates opening balances so computedAccounts = api.balance for the current transactions.
   * Merges with existing entries so new accounts get their opening balance set correctly.
   */
  const recalibrateOpeningBalances = useCallback((freshAccounts: Account[], currentTxs: Transaction[]) => {
    const next: Record<string, number> = { ...openingBalancesRef.current };
    freshAccounts.forEach((acc) => {
      const txNet = computeTxNet(acc.id, currentTxs);
      next[acc.id] = acc.balance - txNet;
    });
    openingBalancesRef.current = next;
  }, []);

  const loadSeqRef = useRef(0);
  const loadWalletRef = useRef<string | null>(null);

  const loadAll = useCallback(async () => {
    const mySeq = ++loadSeqRef.current;
    const myWalletId = selectedWalletId;
    loadWalletRef.current = myWalletId;
    setIsLoading(true);
    try {
      const [cats, accs, txs, invs, buds, gls, cards, tagList, notifs, settingsRaw] = await Promise.allSettled([
        apiGet<unknown>(wq('/api/categories')),
        apiGet<unknown>(wq('/api/accounts')),
        apiGet<unknown>(wq('/api/transactions')),
        apiGet<unknown>(wq('/api/investments')),
        apiGet<unknown>(wq('/api/budgets')),
        apiGet<unknown>(wq('/api/goals')),
        apiGet<unknown>(wq('/api/cards')),
        apiGet<unknown>(wq('/api/tags')),
        apiGet<unknown>('/api/notifications'),
        apiGet<unknown>('/api/settings'),
      ]);

      // Descarta resultado se outro loadAll começou (ex.: troca rápida de carteira).
      if (mySeq !== loadSeqRef.current || myWalletId !== loadWalletRef.current) {
        return;
      }

      const catList = toArray<ApiCategory>(cats.status === 'fulfilled' ? cats.value : []);
      const catMap: Record<string, ApiCategory> = {};
      catList.forEach((c) => { catMap[c.id] = c; });
      catMapRef.current = catMap;
      setCategories(catList);

      const accsData = toArray<Record<string, unknown>>(accs.status === 'fulfilled' ? accs.value : []);
      const mappedAccounts = accsData.map(transformAccount);
      setAccounts(mappedAccounts);

      const txsData = toArray<Record<string, unknown>>(txs.status === 'fulfilled' ? txs.value : []);
      const mappedTx = txsData.map((r) => transformTransaction(r, catMap));
      setTransactions(mappedTx);
      transactionsRef.current = mappedTx;

      recalibrateOpeningBalances(mappedAccounts, mappedTx);

      const cardsData = toArray<Record<string, unknown>>(cards.status === 'fulfilled' ? cards.value : []);
      const mappedCards = cardsData.map((r) => transformCard(r, mappedTx));
      setCreditCards(mappedCards);

      const invsData = toArray<Record<string, unknown>>(invs.status === 'fulfilled' ? invs.value : []);
      setInvestments(invsData.map(transformInvestment));

      const budsData = toArray<Record<string, unknown>>(buds.status === 'fulfilled' ? buds.value : []);
      setBudgets(budsData.map((r) => transformBudget(r, catMap)));

      const glsData = toArray<Record<string, unknown>>(gls.status === 'fulfilled' ? gls.value : []);
      setGoals(glsData.map(transformGoal));

      const tagData = toArray<Tag>(tagList.status === 'fulfilled' ? tagList.value : []);
      setTags(tagData);

      const notifData = toArray<AppNotification>(notifs.status === 'fulfilled' ? notifs.value : []);
      setNotifications(notifData);

      if (settingsRaw.status === 'fulfilled' && settingsRaw.value && typeof settingsRaw.value === 'object') {
        const sv = settingsRaw.value as Record<string, unknown>;
        if (sv.id || sv.currency) setSettings(transformSettings(sv));
      }
    } catch (e) {
      logger.warn('[FinanceContext] loadAll error', e);
    } finally {
      if (mySeq === loadSeqRef.current) setIsLoading(false);
    }
  }, [wq, selectedWalletId, recalibrateOpeningBalances]);

  const loadAllRef = useRef(loadAll);
  useEffect(() => { loadAllRef.current = loadAll; }, [loadAll]);
  const reload = useCallback(() => { loadAllRef.current(); }, []);

  useEffect(() => {
    if (isAuthenticated && walletReady) {
      loadAll();
    } else if (!isAuthenticated) {
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
      openingBalancesRef.current = {};
      transactionsRef.current = [];
      setIsLoading(false);
    }
  }, [isAuthenticated, walletReady, selectedWalletId, loadAll]);

  // Keep transactionsRef in sync so callbacks can access latest transactions
  // without stale closures (needed by updateAccount balance sync).
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  // ── Computed ───────────────────────────────────────────────────────────────

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  // Group by competence date (transactionDate for card purchases, date otherwise)
  // so card expenses appear in the month they were actually made — matching web.
  const monthlyTx = transactions.filter((t) => {
    const effectiveDate = t.transactionDate ?? t.date;
    return effectiveDate.startsWith(currentMonth);
  });
  const prevMonthTx = transactions.filter((t) => {
    const effectiveDate = t.transactionDate ?? t.date;
    return effectiveDate.startsWith(prevMonth);
  });
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

  // Recompute card.used from current transactions so adding/removing card expenses
  // updates the invoice balance instantly (same pattern as computedAccounts).
  const computedCreditCards = useMemo(() => {
    const now = new Date();
    return creditCards.map((card) => {
      const openInvoiceMonth = getCurrentInvoiceMonth(card.closingDay, now);
      const { start, end } = getBillingPeriod(card.closingDay, openInvoiceMonth);
      const billingTx = transactions.filter((t) => {
        if (t.creditCardId !== card.id) return false;
        if (t.type !== 'expense') return false;
        if (isInvoicePayment(t)) return false;
        // Use the original purchase date for the billing window, not the due date.
        const purchaseDate = t.transactionDate ?? t.date;
        return purchaseDate >= start && purchaseDate <= end;
      });
      const usedPosted = billingTx
        .filter((t) => t.isPaid !== false)
        .reduce((s, t) => s + t.amount, 0);
      const usedPending = billingTx
        .filter((t) => t.isPaid === false)
        .reduce((s, t) => s + t.amount, 0);
      const used = usedPosted + usedPending;
      return { ...card, used, usedPosted, usedPending };
    });
  }, [creditCards, transactions]);

  // cashBalance = saldo líquido das contas (não inclui crédito nem arquivadas).
  // totalBalance é mantido como alias para compatibilidade com código existente.
  const cashBalance = computedAccounts.filter((a) => !a.archived && a.type !== 'credit').reduce((s, a) => s + a.balance, 0);
  const totalBalance = cashBalance;
  const totalInvestments = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalCreditUsed = computedCreditCards.filter((c) => !c.archived).reduce((s, c) => s + (c.used || 0), 0);
  // netWorth = caixa + investimentos - dívida de cartão.
  const netWorth = cashBalance + totalInvestments - totalCreditUsed;
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
    const body: Record<string, unknown> = {
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
    if (selectedWalletId) body.walletId = selectedWalletId;
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/transactions', body);
      const newTx = transformTransaction(raw, catMapRef.current);
      // Add transaction first so the balance recalculates immediately
      setTransactions((prev) => {
        const next = [newTx, ...prev];
        transactionsRef.current = next;
        return next;
      });
      // Then refresh accounts from API and recalibrate opening balances
      if (raw.accountId) {
        const updatedAcc = await apiGet<Record<string, unknown>[]>(wq('/api/accounts'));
        if (Array.isArray(updatedAcc)) {
          const freshAccounts = updatedAcc.map(transformAccount);
          recalibrateOpeningBalances(freshAccounts, transactionsRef.current);
          setAccounts(freshAccounts);
        }
      }
    } catch (e) {
      console.warn('[addTransaction] API error:', e);
      const optimistic: Transaction = { ...t, id: uid() };
      setTransactions((prev) => [optimistic, ...prev]);
    }
  }, [recalibrateOpeningBalances, wq, selectedWalletId]);

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
    } catch (e) {
      logger.warn('[updateTransaction]', e);
      notifyError('Não foi possível atualizar a transação.');
      loadAllRef.current();
    }
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    setTransactions((prev) => {
      const next = prev.filter((item) => item.id !== id);
      transactionsRef.current = next;
      return next;
    });
    try {
      await apiDelete(`/api/transactions/${id}`);
      const updatedAcc = await apiGet<Record<string, unknown>[]>(wq('/api/accounts'));
      if (Array.isArray(updatedAcc)) {
        const freshAccounts = updatedAcc.map(transformAccount);
        recalibrateOpeningBalances(freshAccounts, transactionsRef.current);
        setAccounts(freshAccounts);
      }
    } catch (e) {
      logger.warn('[deleteTransaction]', e);
      notifyError('Não foi possível excluir a transação. Atualize e tente novamente.');
      loadAllRef.current();
    }
  }, [recalibrateOpeningBalances, wq]);

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
      setTransactions((prev) => {
        const next = [newTx, ...prev];
        transactionsRef.current = next;
        return next;
      });
      const updatedAcc = await apiGet<Record<string, unknown>[]>(wq('/api/accounts'));
      if (Array.isArray(updatedAcc)) {
        const freshAccounts = updatedAcc.map(transformAccount);
        recalibrateOpeningBalances(freshAccounts, transactionsRef.current);
        setAccounts(freshAccounts);
      }
    } catch {
      const optimistic: Transaction = {
        id: uid(), description, amount, type: 'transfer',
        category: 'transfer', accountId: fromAccountId, toAccountId, date,
      };
      setTransactions((prev) => [optimistic, ...prev]);
    }
  }, [recalibrateOpeningBalances, wq]);

  // ── Accounts ───────────────────────────────────────────────────────────────

  const addAccount = useCallback(async (a: Omit<Account, 'id'>) => {
    const body: Record<string, unknown> = {
      name: a.name,
      type: a.type === 'savings' ? 'savings' : a.type,
      institution: a.institution,
      balance: a.balance,
      color: a.color,
      creditLimit: a.creditLimit || undefined,
    };
    if (selectedWalletId) body.walletId = selectedWalletId;
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
  }, [selectedWalletId]);

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
    } catch (e) {
      logger.warn('[updateAccount]', e);
      notifyError('Não foi possível atualizar a conta.');
      loadAllRef.current();
    }
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    setAccounts((prev) => prev.filter((item) => item.id !== id));
    try {
      await apiDelete(`/api/accounts/${id}`);
    } catch (e) {
      logger.warn('[deleteAccount]', e);
      notifyError('Não foi possível excluir a conta.');
      loadAllRef.current();
    }
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
    } catch (e) {
      logger.warn('[updateCreditCard]', e);
      notifyError('Não foi possível atualizar o cartão.');
      loadAllRef.current();
    }
  }, []);

  const deleteCreditCard = useCallback(async (id: string) => {
    setCreditCards((prev) => prev.filter((item) => item.id !== id));
    try {
      await apiDelete(`/api/cards/${id}`);
    } catch (e) {
      logger.warn('[deleteCreditCard]', e);
      notifyError('Não foi possível excluir o cartão.');
      loadAllRef.current();
    }
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
    // Prefer the explicit creditCardId link if any transaction in the dataset
    // carries one (the web backend tags real card purchases this way). Otherwise
    // fall back to matching the card's underlying account id.
    const anyHasCardId = transactions.some((t) => t.creditCardId);
    return transactions.filter((t) => {
      if (anyHasCardId) {
        if (t.creditCardId !== cardId) return false;
      } else {
        if (t.accountId !== card.accountId) return false;
      }
      if (t.type === 'transfer') return false;
      if (isInvoicePayment(t)) return false;
      // Defensive: also exclude obvious account transfers wrongly typed as expense
      const desc = (t.description || '').toLowerCase();
      if (desc.startsWith('transferência') || desc.startsWith('transferencia')) return false;
      if (month) {
        const { start, end } = getBillingPeriod(card.closingDay, month);
        const purchaseDate = t.transactionDate ?? t.date;
        return purchaseDate >= start && purchaseDate <= end;
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
    } catch (e) {
      logger.warn('[updateInvestment]', e);
      notifyError('Não foi possível atualizar o investimento.');
      loadAllRef.current();
    }
  }, []);

  const deleteInvestment = useCallback(async (id: string) => {
    setInvestments((prev) => prev.filter((item) => item.id !== id));
    try {
      await apiDelete(`/api/investments/${id}`);
    } catch (e) {
      logger.warn('[deleteInvestment]', e);
      notifyError('Não foi possível excluir o investimento.');
      loadAllRef.current();
    }
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
    } catch (e) {
      logger.warn('[updateGoal]', e);
      notifyError('Não foi possível atualizar a meta.');
      loadAllRef.current();
    }
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    setGoals((prev) => prev.filter((item) => item.id !== id));
    try {
      await apiDelete(`/api/goals/${id}`);
    } catch (e) {
      logger.warn('[deleteGoal]', e);
      notifyError('Não foi possível excluir a meta.');
      loadAllRef.current();
    }
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
    } catch (e) {
      try {
        await apiPatch(`/api/goals/${goalId}`, { currentAmount: newAmount });
      } catch (err) {
        logger.warn('[addContribution] fallback failed', err);
        notifyError('Não foi possível registrar a contribuição.');
        loadAllRef.current();
      }
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
    } catch (e) {
      logger.warn('[updateBudget]', e);
      notifyError('Não foi possível atualizar o orçamento.');
      loadAllRef.current();
    }
  }, []);

  const deleteBudget = useCallback(async (id: string) => {
    setBudgets((prev) => prev.filter((item) => item.id !== id));
    try {
      await apiDelete(`/api/budgets/${id}`);
    } catch (e) {
      logger.warn('[deleteBudget]', e);
      notifyError('Não foi possível excluir o orçamento.');
      loadAllRef.current();
    }
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
    } catch (e) {
      logger.warn('[addCategory]', e);
      notifyError('Não foi possível criar a categoria.');
    }
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
      transactions, accounts: computedAccounts, creditCards: computedCreditCards, investments, budgets, goals,
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
      totalBalance, cashBalance, netWorth, monthlyIncome, monthlyExpenses, prevMonthIncome, prevMonthExpenses, netResult, healthScore,
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
