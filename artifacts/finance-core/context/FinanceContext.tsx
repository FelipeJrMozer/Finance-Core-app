import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete, apiFetch } from '@/services/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountType = 'checking' | 'savings' | 'investment' | 'credit' | 'wallet';

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
  receiptUri?: string;
  currency?: string;
  transferGroupId?: string;
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
  type: 'stocks' | 'fii' | 'reit' | 'fixed' | 'crypto' | 'etf' | 'acoes';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currency: 'BRL' | 'USD';
  purchaseDate?: string;
  status?: string;
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
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  icon: string;
  color: string;
  description?: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  color: string | null;
  parentId: string | null;
}

// ── Category Mapping ──────────────────────────────────────────────────────────

const NAME_TO_KEY: Record<string, string> = {
  salário: 'income', renda: 'income', 'outras receitas': 'income', receita: 'income', dividendo: 'income',
  alimentação: 'food', mercado: 'food', restaurante: 'food', refeição: 'food',
  casa: 'housing', moradia: 'housing', aluguel: 'housing', água: 'housing', luz: 'housing', energia: 'housing',
  internet: 'internet', telefone: 'internet',
  transporte: 'transport', carro: 'transport', combustível: 'transport', mecanica: 'transport', mechânica: 'transport', uber: 'transport',
  saúde: 'health', médico: 'health', farmácia: 'health', dentista: 'health',
  educação: 'education', escola: 'education', curso: 'education',
  entretenimento: 'entertainment', lazer: 'leisure', streaming: 'entertainment',
  roupas: 'clothing', roupa: 'clothing', vestuário: 'clothing',
  investimento: 'investment', carteira: 'investment',
  'outras despesas': 'other', outros: 'other', geral: 'other',
};

function catNameToKey(name: string): string {
  const lower = name.toLowerCase().trim();
  return NAME_TO_KEY[lower] || 'other';
}

// ── Transform helpers ─────────────────────────────────────────────────────────

function parseDate(d: string): string {
  if (!d) return new Date().toISOString().split('T')[0];
  return d.split('T')[0];
}

function transformTransaction(raw: Record<string, unknown>, catMap: Record<string, ApiCategory>): Transaction {
  const cat = catMap[raw.categoryId as string];
  const categoryKey = cat ? (cat.type === 'income' ? 'income' : catNameToKey(cat.name)) : (raw.type === 'income' ? 'income' : 'other');
  return {
    id: raw.id as string,
    description: raw.description as string,
    amount: parseFloat(raw.amount as string),
    type: raw.type as TransactionType,
    category: categoryKey,
    categoryId: raw.categoryId as string,
    accountId: raw.accountId as string,
    toAccountId: (raw.toAccountId as string) || undefined,
    date: parseDate(raw.date as string),
    installments: raw.totalInstallments ? Number(raw.totalInstallments) : undefined,
    currentInstallment: raw.installmentNumber ? Number(raw.installmentNumber) : undefined,
    totalInstallments: raw.totalInstallments ? Number(raw.totalInstallments) : undefined,
    recurring: (raw.isRecurring as boolean) || (raw.isFixed as boolean) || false,
    isFixed: raw.isFixed as boolean,
    isPaid: raw.isPaid as boolean,
    tags: (raw.tags as string[]) || [],
    notes: (raw.notes as string) || undefined,
    currency: (raw.currency as string) || 'BRL',
    transferGroupId: (raw.transferGroupId as string) || undefined,
  };
}

function transformAccount(raw: Record<string, unknown>): Account {
  let type = raw.type as AccountType;
  if (type === ('wallet' as AccountType)) type = 'savings';
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

function transformCard(raw: Record<string, unknown>, transactions: Transaction[]): CreditCard {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const closingDay = Number(raw.closingDay) || 1;
  const dueDay = Number(raw.dueDay) || 10;

  const formatDay = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const used = transactions
    .filter((t) => t.accountId === (raw.accountId as string) && t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  return {
    id: raw.id as string,
    accountId: raw.accountId as string,
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
  let type = raw.type as Investment['type'];
  if (type === ('acoes' as Investment['type'])) type = 'stocks';
  return {
    id: raw.id as string,
    name: (raw.name as string) || (raw.ticker as string) || '',
    ticker: (raw.ticker as string) || '',
    type,
    quantity: parseFloat(raw.quantity as string) || 0,
    avgPrice: parseFloat((raw.averagePrice || raw.purchasePrice) as string) || 0,
    currentPrice: parseFloat(raw.currentPrice as string) || 0,
    currency: 'BRL',
    purchaseDate: raw.purchaseDate ? parseDate(raw.purchaseDate as string) : undefined,
    status: (raw.status as string) || 'active',
  };
}

function transformBudget(raw: Record<string, unknown>, catMap: Record<string, ApiCategory>): Budget {
  const cat = catMap[raw.categoryId as string];
  const categoryKey = cat ? catNameToKey(cat.name) : 'other';
  const month = String(raw.month).padStart(2, '0');
  return {
    id: raw.id as string,
    category: categoryKey,
    categoryId: raw.categoryId as string,
    limit: parseFloat(raw.amount as string) || 0,
    month: `${raw.year}-${month}`,
  };
}

function transformGoal(raw: Record<string, unknown>): Goal {
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: (raw.description as string) || undefined,
    targetAmount: parseFloat(raw.targetAmount as string) || 0,
    currentAmount: parseFloat(raw.currentAmount as string) || 0,
    deadline: parseDate(raw.deadline as string),
    icon: (raw.icon as string) || 'target',
    color: '#0096C7',
  };
}

// ── Context definition ────────────────────────────────────────────────────────

interface FinanceContextType {
  transactions: Transaction[];
  accounts: Account[];
  creditCards: CreditCard[];
  investments: Investment[];
  budgets: Budget[];
  goals: Goal[];
  categories: ApiCategory[];
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
  addCardExpense: (cardId: string, t: Omit<Transaction, 'id' | 'cardId'>) => void;
  payCardInvoice: (cardId: string, amount: number, accountId: string) => void;
  advanceInstallment: (transactionId: string) => void;
  getCardTransactions: (cardId: string, month?: string) => Transaction[];

  addInvestment: (i: Omit<Investment, 'id'>) => Promise<void>;
  updateInvestment: (id: string, i: Partial<Investment>) => Promise<void>;

  addGoal: (g: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, g: Partial<Goal>) => Promise<void>;
  addContribution: (goalId: string, amount: number) => Promise<void>;

  addBudget: (b: Omit<Budget, 'id'>) => Promise<void>;
  updateBudget: (id: string, b: Partial<Budget>) => Promise<void>;

  refresh: () => Promise<void>;

  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netResult: number;
  healthScore: number;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

// ── Category ID lookup helper ─────────────────────────────────────────────────

function findCategoryId(
  categories: ApiCategory[],
  key: string,
  type: 'income' | 'expense'
): string | undefined {
  if (type === 'income' || key === 'income') {
    return categories.find((c) => c.type === 'income')?.id;
  }
  const nameMap: Record<string, string[]> = {
    food: ['alimentação', 'comida', 'mercado'],
    housing: ['casa', 'moradia', 'aluguel', 'água', 'luz'],
    internet: ['internet', 'telefone'],
    transport: ['transporte', 'carro', 'combustível', 'mecanica'],
    health: ['saúde', 'médico', 'farmácia'],
    education: ['educação', 'escola'],
    entertainment: ['entretenimento', 'lazer'],
    clothing: ['roupas', 'roupa', 'vestuário'],
    investment: ['investimento'],
    other: ['outras despesas', 'outros'],
  };
  const patterns = nameMap[key] || [key];
  const found = categories.find(
    (c) => c.type === 'expense' && patterns.some((p) => c.name.toLowerCase().includes(p))
  );
  return found?.id || categories.find((c) => c.type === 'expense')?.id;
}

// ── Provider ──────────────────────────────────────────────────────────────────

const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const catMapRef = useRef<Record<string, ApiCategory>>({});

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cats, accs, txs, invs, buds, gls, cards] = await Promise.all([
        apiGet<ApiCategory[]>('/api/categories').catch(() => []),
        apiGet<Record<string, unknown>[]>('/api/accounts').catch(() => []),
        apiGet<Record<string, unknown>[]>('/api/transactions').catch(() => []),
        apiGet<Record<string, unknown>[]>('/api/investments').catch(() => []),
        apiGet<Record<string, unknown>[]>('/api/budgets').catch(() => []),
        apiGet<Record<string, unknown>[]>('/api/goals').catch(() => []),
        apiGet<Record<string, unknown>[]>('/api/cards').catch(() => []),
      ]);

      const catMap: Record<string, ApiCategory> = {};
      cats.forEach((c) => { catMap[c.id] = c; });
      catMapRef.current = catMap;
      setCategories(cats);

      const mappedAccounts = accs.map(transformAccount);
      setAccounts(mappedAccounts);

      const mappedTx = txs.map((r) => transformTransaction(r, catMap));
      setTransactions(mappedTx);

      const mappedCards = cards.map((r) => transformCard(r, mappedTx));
      setCreditCards(mappedCards);

      setInvestments(invs.map(transformInvestment));
      setBudgets(buds.map((r) => transformBudget(r, catMap)));
      setGoals(gls.map(transformGoal));
    } catch (e) {
      console.warn('[FinanceContext] loadAll failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Computed ───────────────────────────────────────────────────────────────

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyTx = transactions.filter((t) => t.date.startsWith(currentMonth));

  const totalBalance = accounts
    .filter((a) => !a.archived && a.type !== 'credit')
    .reduce((s, a) => s + a.balance, 0);

  const monthlyIncome = monthlyTx
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const monthlyExpenses = monthlyTx
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const netResult = monthlyIncome - monthlyExpenses;

  const savingsRate = monthlyIncome > 0 ? Math.max(0, netResult / monthlyIncome) : 0;
  const healthScore = Math.min(100, Math.round(savingsRate * 100));

  // ── Transactions ───────────────────────────────────────────────────────────

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
    const cats = catMapRef.current;
    const catList = Object.values(cats);
    const categoryId = t.categoryId || findCategoryId(catList, t.category, t.type === 'transfer' ? 'expense' : t.type as 'income' | 'expense');

    const body = {
      description: t.description,
      amount: t.amount,
      type: t.type,
      date: t.date,
      accountId: t.accountId,
      categoryId,
      toAccountId: t.toAccountId || undefined,
      isPaid: t.type === 'income' || (t.isPaid ?? true),
      isFixed: t.recurring || t.isFixed || false,
      isRecurring: t.recurring || false,
      notes: t.notes || '',
      tags: t.tags || [],
      totalInstallments: t.installments && t.installments > 1 ? t.installments : undefined,
    };

    try {
      const raw = await apiPost<Record<string, unknown>>('/api/transactions', body);
      const newTx = transformTransaction(raw, catMapRef.current);
      setTransactions((prev) => [newTx, ...prev]);
    } catch {
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
        categoryId: t.categoryId,
        notes: t.notes,
        tags: t.tags,
        isPaid: t.isPaid,
      });
    } catch {}
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    setTransactions((prev) => prev.filter((item) => item.id !== id));
    try {
      await apiDelete(`/api/transactions/${id}`);
    } catch {}
  }, []);

  const addTransfer = useCallback(async (
    fromAccountId: string, toAccountId: string,
    amount: number, description: string, date: string
  ) => {
    const body = {
      description,
      amount,
      type: 'transfer',
      date,
      accountId: fromAccountId,
      toAccountId,
      categoryId: categories.find((c) => c.type === 'expense')?.id,
    };
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/transactions', body);
      const newTx = transformTransaction(raw, catMapRef.current);
      setTransactions((prev) => [newTx, ...prev]);
    } catch {
      const optimistic: Transaction = {
        id: uid(), description, amount, type: 'transfer',
        category: 'transfer', accountId: fromAccountId, toAccountId, date,
      };
      setTransactions((prev) => [optimistic, ...prev]);
    }
  }, [categories]);

  // ── Accounts ───────────────────────────────────────────────────────────────

  const addAccount = useCallback(async (a: Omit<Account, 'id'>) => {
    const body = { name: a.name, type: a.type, institution: a.institution, balance: a.balance, color: a.color };
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/accounts', body);
      setAccounts((prev) => [...prev, transformAccount(raw)]);
    } catch {
      setAccounts((prev) => [...prev, { ...a, id: uid() }]);
    }
  }, []);

  const updateAccount = useCallback(async (id: string, a: Partial<Account>) => {
    setAccounts((prev) => prev.map((item) => item.id === id ? { ...item, ...a } : item));
    try {
      await apiPatch(`/api/accounts/${id}`, a);
    } catch {}
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    setAccounts((prev) => prev.filter((item) => item.id !== id));
    try {
      await apiDelete(`/api/accounts/${id}`);
    } catch {}
  }, []);

  // ── Credit Cards ───────────────────────────────────────────────────────────

  const addCreditCard = useCallback(async (c: Omit<CreditCard, 'id' | 'used'>) => {
    const body = {
      name: c.name,
      brand: c.brand || c.institution,
      creditLimit: c.limit,
      closingDay: c.closingDay || 1,
      dueDay: c.dueDay || 10,
      color: c.color,
      accountId: c.accountId,
    };
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/cards', body);
      const mapped = transformCard(raw, transactions);
      setCreditCards((prev) => [...prev, mapped]);
    } catch {
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
    try {
      await apiDelete(`/api/cards/${id}`);
    } catch {}
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
      if (month && !t.date.startsWith(month)) return false;
      return true;
    });
  }, [creditCards, transactions]);

  // ── Investments ────────────────────────────────────────────────────────────

  const addInvestment = useCallback(async (i: Omit<Investment, 'id'>) => {
    const body = {
      name: i.name, ticker: i.ticker,
      type: i.type === 'stocks' ? 'acoes' : i.type,
      quantity: i.quantity, purchasePrice: i.avgPrice,
      currentPrice: i.currentPrice,
      purchaseDate: i.purchaseDate || new Date().toISOString().split('T')[0],
      status: 'active',
    };
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/investments', body);
      setInvestments((prev) => [...prev, transformInvestment(raw)]);
    } catch {
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
      });
    } catch {}
  }, []);

  // ── Goals ──────────────────────────────────────────────────────────────────

  const addGoal = useCallback(async (g: Omit<Goal, 'id'>) => {
    const body = {
      name: g.name, description: g.description || '',
      targetAmount: g.targetAmount, currentAmount: g.currentAmount || 0,
      deadline: g.deadline, icon: g.icon || 'target',
    };
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/goals', body);
      setGoals((prev) => [...prev, transformGoal(raw)]);
    } catch {
      setGoals((prev) => [...prev, { ...g, id: uid() }]);
    }
  }, []);

  const updateGoal = useCallback(async (id: string, g: Partial<Goal>) => {
    setGoals((prev) => prev.map((item) => item.id === id ? { ...item, ...g } : item));
    try {
      await apiPatch(`/api/goals/${id}`, {
        name: g.name, targetAmount: g.targetAmount,
        currentAmount: g.currentAmount, deadline: g.deadline, icon: g.icon,
      });
    } catch {}
  }, []);

  const addContribution = useCallback(async (goalId: string, amount: number) => {
    setGoals((prev) => prev.map((g) => g.id === goalId
      ? { ...g, currentAmount: Math.min(g.currentAmount + amount, g.targetAmount) }
      : g
    ));
    try {
      const goal = goals.find((g) => g.id === goalId);
      if (goal) {
        await apiPatch(`/api/goals/${goalId}`, {
          currentAmount: Math.min(goal.currentAmount + amount, goal.targetAmount),
        });
      }
    } catch {}
  }, [goals]);

  // ── Budgets ────────────────────────────────────────────────────────────────

  const addBudget = useCallback(async (b: Omit<Budget, 'id'>) => {
    const cats = Object.values(catMapRef.current);
    const categoryId = b.categoryId || findCategoryId(cats, b.category, 'expense');
    const [year, month] = b.month.split('-');
    const body = {
      categoryId,
      amount: b.limit,
      month: parseInt(month),
      year: parseInt(year),
    };
    try {
      const raw = await apiPost<Record<string, unknown>>('/api/budgets', body);
      setBudgets((prev) => [...prev, transformBudget(raw, catMapRef.current)]);
    } catch {
      setBudgets((prev) => [...prev, { ...b, id: uid() }]);
    }
  }, []);

  const updateBudget = useCallback(async (id: string, b: Partial<Budget>) => {
    setBudgets((prev) => prev.map((item) => item.id === id ? { ...item, ...b } : item));
    try {
      await apiPatch(`/api/budgets/${id}`, { amount: b.limit });
    } catch {}
  }, []);

  // ── Refresh ────────────────────────────────────────────────────────────────

  const refresh = useCallback(() => loadAll(), [loadAll]);

  return (
    <FinanceContext.Provider value={{
      transactions, accounts, creditCards, investments, budgets, goals, categories, isLoading,
      addTransaction, updateTransaction, deleteTransaction, addTransfer,
      addAccount, updateAccount, deleteAccount,
      addCreditCard, updateCreditCard, deleteCreditCard, addCardExpense, payCardInvoice,
      advanceInstallment, getCardTransactions,
      addInvestment, updateInvestment,
      addGoal, updateGoal, addContribution,
      addBudget, updateBudget,
      refresh,
      totalBalance, monthlyIncome, monthlyExpenses, netResult, healthScore,
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
