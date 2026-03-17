export interface TransactionIntent {
  rawText: string;
  amount: string;
  source: 'notification' | 'sms' | 'whatsapp' | 'manual';
  sender?: string;
}

export function useTransactionIntent() {
  return {
    intent: null as TransactionIntent | null,
    clearIntent: () => {},
  };
}

export function captureInitialIntent() {}
