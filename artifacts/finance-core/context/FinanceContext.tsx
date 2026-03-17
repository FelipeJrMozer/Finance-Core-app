import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TransactionType = 'income' | 'expense';
export type AccountType = 'checking' | 'savings' | 'investment' | 'credit';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  accountId: string;
  date: string;
  installments?: number;
  recurring?: boolean;
  receiptUri?: string;
  tags?: string[];
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  institution: string;
  color: string;
  archived?: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  institution: string;
  limit: number;
  used: number;
  dueDate: string;
  closingDate: string;
  color: string;
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
}

export interface Budget {
  id: string;
  category: string;
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
}

export interface DARF {
  id: string;
  type: string;
  month: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  paidDate?: string;
}

interface FinanceContextType {
  transactions: Transaction[];
  accounts: Account[];
  creditCards: CreditCard[];
  investments: Investment[];
  budgets: Budget[];
  goals: Goal[];
  darfs: DARF[];
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addAccount: (a: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, a: Partial<Account>) => void;
  addCreditCard: (c: Omit<CreditCard, 'id'>) => void;
  updateCreditCard: (id: string, c: Partial<CreditCard>) => void;
  addInvestment: (i: Omit<Investment, 'id'>) => void;
  updateInvestment: (id: string, i: Partial<Investment>) => void;
  addGoal: (g: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, g: Partial<Goal>) => void;
  addContribution: (goalId: string, amount: number) => void;
  addBudget: (b: Omit<Budget, 'id'>) => void;
  updateBudget: (id: string, b: Partial<Budget>) => void;
  markDARFPaid: (id: string) => void;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netResult: number;
  healthScore: number;
  isLoading: boolean;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

const KEYS = {
  transactions: 'fc_transactions',
  accounts: 'fc_accounts',
  creditCards: 'fc_credit_cards',
  investments: 'fc_investments',
  budgets: 'fc_budgets',
  goals: 'fc_goals',
  darfs: 'fc_darfs',
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

function generateDemoData() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const accounts: Account[] = [
    { id: '1', name: 'Conta Corrente', type: 'checking', balance: 8420.50, institution: 'Nubank', color: '#8B5CF6', archived: false },
    { id: '2', name: 'Poupança', type: 'savings', balance: 25000.00, institution: 'Bradesco', color: '#3B82F6', archived: false },
    { id: '3', name: 'Investimentos', type: 'investment', balance: 45200.00, institution: 'XP Investimentos', color: '#00C853', archived: false },
  ];

  const creditCards: CreditCard[] = [
    { id: '1', name: 'Nubank Ultravioleta', institution: 'Nubank', limit: 15000, used: 3200, dueDate: '2026-04-10', closingDate: '2026-04-03', color: '#8B5CF6' },
    { id: '2', name: 'Bradesco Visa Infinite', institution: 'Bradesco', limit: 20000, used: 8500, dueDate: '2026-04-15', closingDate: '2026-04-08', color: '#3B82F6' },
  ];

  const transactions: Transaction[] = [
    { id: '1', description: 'Salário', amount: 8500, type: 'income', category: 'income', accountId: '1', date: `${currentMonth}-01`, recurring: true },
    { id: '2', description: 'Freelance Design', amount: 2000, type: 'income', category: 'income', accountId: '1', date: `${currentMonth}-05` },
    { id: '3', description: 'Aluguel', amount: 2200, type: 'expense', category: 'housing', accountId: '1', date: `${currentMonth}-05`, recurring: true },
    { id: '4', description: 'Supermercado', amount: 450, type: 'expense', category: 'food', accountId: '1', date: `${currentMonth}-08` },
    { id: '5', description: 'Uber', amount: 32, type: 'expense', category: 'transport', accountId: '1', date: `${currentMonth}-09` },
    { id: '6', description: 'Netflix', amount: 55, type: 'expense', category: 'entertainment', accountId: '1', date: `${currentMonth}-10`, recurring: true },
    { id: '7', description: 'Academia', amount: 120, type: 'expense', category: 'health', accountId: '1', date: `${currentMonth}-01`, recurring: true },
    { id: '8', description: 'Restaurante', amount: 89, type: 'expense', category: 'food', accountId: '1', date: `${currentMonth}-12` },
    { id: '9', description: 'Conta de Luz', amount: 180, type: 'expense', category: 'housing', accountId: '1', date: `${currentMonth}-15` },
    { id: '10', description: 'Spotify', amount: 19.90, type: 'expense', category: 'entertainment', accountId: '1', date: `${currentMonth}-10`, recurring: true },
    { id: '11', description: 'iPhone 15 Pro', amount: 1200, type: 'expense', category: 'clothing', accountId: '2', date: `${currentMonth}-11`, installments: 12 },
    { id: '12', description: 'Dividendos MXRF11', amount: 320, type: 'income', category: 'investment', accountId: '3', date: `${currentMonth}-14` },
  ];

  const investments: Investment[] = [
    { id: '1', name: 'MXRF11 - Maxi Renda', ticker: 'MXRF11', type: 'fii', quantity: 200, avgPrice: 10.50, currentPrice: 11.20, currency: 'BRL' },
    { id: '2', name: 'PETR4 - Petrobras', ticker: 'PETR4', type: 'stocks', quantity: 100, avgPrice: 38.50, currentPrice: 42.10, currency: 'BRL' },
    { id: '3', name: 'IVVB11 - S&P500', ticker: 'IVVB11', type: 'etf', quantity: 50, avgPrice: 280.00, currentPrice: 312.50, currency: 'BRL' },
    { id: '4', name: 'Bitcoin', ticker: 'BTC', type: 'crypto', quantity: 0.15, avgPrice: 250000, currentPrice: 312000, currency: 'BRL' },
    { id: '5', name: 'Tesouro IPCA+ 2029', ticker: 'TESOURO', type: 'fixed', quantity: 1, avgPrice: 5000, currentPrice: 5420, currency: 'BRL' },
  ];

  const budgets: Budget[] = [
    { id: '1', category: 'food', limit: 800, month: currentMonth },
    { id: '2', category: 'transport', limit: 300, month: currentMonth },
    { id: '3', category: 'entertainment', limit: 200, month: currentMonth },
    { id: '4', category: 'health', limit: 400, month: currentMonth },
    { id: '5', category: 'housing', limit: 2500, month: currentMonth },
  ];

  const goals: Goal[] = [
    { id: '1', name: 'Reserva de Emergência', targetAmount: 30000, currentAmount: 18000, deadline: '2026-12-31', icon: 'shield', color: '#00C853' },
    { id: '2', name: 'Viagem Europa', targetAmount: 15000, currentAmount: 4500, deadline: '2027-06-30', icon: 'map', color: '#2196F3' },
    { id: '3', name: 'MacBook Pro', targetAmount: 12000, currentAmount: 7200, deadline: '2026-08-31', icon: 'monitor', color: '#9C27B0' },
  ];

  const darfs: DARF[] = [
    { id: '1', type: 'DARF - IRRF Renda Variável', month: currentMonth, amount: 320.50, dueDate: `${currentMonth}-30`, paid: false },
    { id: '2', type: 'DARF - IRRF FIIs', month: currentMonth, amount: 80.00, dueDate: `${currentMonth}-30`, paid: true, paidDate: `${currentMonth}-10` },
  ];

  return { accounts, creditCards, transactions, investments, budgets, goals, darfs };
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [darfs, setDarfs] = useState<DARF[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, a, cc, inv, b, g, d] = await Promise.all([
          AsyncStorage.getItem(KEYS.transactions),
          AsyncStorage.getItem(KEYS.accounts),
          AsyncStorage.getItem(KEYS.creditCards),
          AsyncStorage.getItem(KEYS.investments),
          AsyncStorage.getItem(KEYS.budgets),
          AsyncStorage.getItem(KEYS.goals),
          AsyncStorage.getItem(KEYS.darfs),
        ]);

        if (!a) {
          const demo = generateDemoData();
          setTransactions(demo.transactions);
          setAccounts(demo.accounts);
          setCreditCards(demo.creditCards);
          setInvestments(demo.investments);
          setBudgets(demo.budgets);
          setGoals(demo.goals);
          setDarfs(demo.darfs);
          await Promise.all([
            AsyncStorage.setItem(KEYS.transactions, JSON.stringify(demo.transactions)),
            AsyncStorage.setItem(KEYS.accounts, JSON.stringify(demo.accounts)),
            AsyncStorage.setItem(KEYS.creditCards, JSON.stringify(demo.creditCards)),
            AsyncStorage.setItem(KEYS.investments, JSON.stringify(demo.investments)),
            AsyncStorage.setItem(KEYS.budgets, JSON.stringify(demo.budgets)),
            AsyncStorage.setItem(KEYS.goals, JSON.stringify(demo.goals)),
            AsyncStorage.setItem(KEYS.darfs, JSON.stringify(demo.darfs)),
          ]);
        } else {
          if (t) setTransactions(JSON.parse(t));
          if (a) setAccounts(JSON.parse(a));
          if (cc) setCreditCards(JSON.parse(cc));
          if (inv) setInvestments(JSON.parse(inv));
          if (b) setBudgets(JSON.parse(b));
          if (g) setGoals(JSON.parse(g));
          if (d) setDarfs(JSON.parse(d));
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const save = async (key: string, data: unknown) => {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  };

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    const newT = { ...t, id: uid() };
    setTransactions((prev) => {
      const next = [newT, ...prev];
      save(KEYS.transactions, next);
      return next;
    });
  }, []);

  const updateTransaction = useCallback((id: string, t: Partial<Transaction>) => {
    setTransactions((prev) => {
      const next = prev.map((item) => item.id === id ? { ...item, ...t } : item);
      save(KEYS.transactions, next);
      return next;
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => {
      const next = prev.filter((item) => item.id !== id);
      save(KEYS.transactions, next);
      return next;
    });
  }, []);

  const addAccount = useCallback((a: Omit<Account, 'id'>) => {
    const newA = { ...a, id: uid() };
    setAccounts((prev) => {
      const next = [...prev, newA];
      save(KEYS.accounts, next);
      return next;
    });
  }, []);

  const updateAccount = useCallback((id: string, a: Partial<Account>) => {
    setAccounts((prev) => {
      const next = prev.map((item) => item.id === id ? { ...item, ...a } : item);
      save(KEYS.accounts, next);
      return next;
    });
  }, []);

  const addCreditCard = useCallback((c: Omit<CreditCard, 'id'>) => {
    const newC = { ...c, id: uid() };
    setCreditCards((prev) => {
      const next = [...prev, newC];
      save(KEYS.creditCards, next);
      return next;
    });
  }, []);

  const updateCreditCard = useCallback((id: string, c: Partial<CreditCard>) => {
    setCreditCards((prev) => {
      const next = prev.map((item) => item.id === id ? { ...item, ...c } : item);
      save(KEYS.creditCards, next);
      return next;
    });
  }, []);

  const addInvestment = useCallback((i: Omit<Investment, 'id'>) => {
    const newI = { ...i, id: uid() };
    setInvestments((prev) => {
      const next = [...prev, newI];
      save(KEYS.investments, next);
      return next;
    });
  }, []);

  const updateInvestment = useCallback((id: string, i: Partial<Investment>) => {
    setInvestments((prev) => {
      const next = prev.map((item) => item.id === id ? { ...item, ...i } : item);
      save(KEYS.investments, next);
      return next;
    });
  }, []);

  const addGoal = useCallback((g: Omit<Goal, 'id'>) => {
    const newG = { ...g, id: uid() };
    setGoals((prev) => {
      const next = [...prev, newG];
      save(KEYS.goals, next);
      return next;
    });
  }, []);

  const updateGoal = useCallback((id: string, g: Partial<Goal>) => {
    setGoals((prev) => {
      const next = prev.map((item) => item.id === id ? { ...item, ...g } : item);
      save(KEYS.goals, next);
      return next;
    });
  }, []);

  const addContribution = useCallback((goalId: string, amount: number) => {
    setGoals((prev) => {
      const next = prev.map((item) =>
        item.id === goalId
          ? { ...item, currentAmount: Math.min(item.currentAmount + amount, item.targetAmount) }
          : item
      );
      save(KEYS.goals, next);
      return next;
    });
  }, []);

  const addBudget = useCallback((b: Omit<Budget, 'id'>) => {
    const newB = { ...b, id: uid() };
    setBudgets((prev) => {
      const next = [...prev, newB];
      save(KEYS.budgets, next);
      return next;
    });
  }, []);

  const updateBudget = useCallback((id: string, b: Partial<Budget>) => {
    setBudgets((prev) => {
      const next = prev.map((item) => item.id === id ? { ...item, ...b } : item);
      save(KEYS.budgets, next);
      return next;
    });
  }, []);

  const markDARFPaid = useCallback((id: string) => {
    setDarfs((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, paid: true, paidDate: new Date().toISOString().split('T')[0] } : item
      );
      save(KEYS.darfs, next);
      return next;
    });
  }, []);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyTransactions = transactions.filter((t) => t.date.startsWith(currentMonth));
  const monthlyIncome = monthlyTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = monthlyTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalBalance = accounts.filter((a) => !a.archived).reduce((s, a) => s + a.balance, 0);
  const netResult = monthlyIncome - monthlyExpenses;

  const savingsRate = monthlyIncome > 0 ? (netResult / monthlyIncome) * 100 : 0;
  const investmentRatio = totalBalance > 0 ? (investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0) / totalBalance) * 100 : 0;
  const healthScore = Math.min(1000, Math.max(0,
    (savingsRate > 20 ? 200 : savingsRate * 10) +
    (investmentRatio > 30 ? 300 : investmentRatio * 10) +
    (netResult > 0 ? 200 : 0) +
    (goals.length > 0 ? 150 : 0) +
    (budgets.length > 0 ? 150 : 0)
  ));

  return (
    <FinanceContext.Provider value={{
      transactions, accounts, creditCards, investments, budgets, goals, darfs,
      addTransaction, updateTransaction, deleteTransaction,
      addAccount, updateAccount, addCreditCard, updateCreditCard,
      addInvestment, updateInvestment, addGoal, updateGoal, addContribution,
      addBudget, updateBudget, markDARFPaid,
      totalBalance, monthlyIncome, monthlyExpenses, netResult, healthScore,
      isLoading,
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
