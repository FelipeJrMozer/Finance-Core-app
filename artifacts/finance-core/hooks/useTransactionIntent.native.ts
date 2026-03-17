import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { AppState, AppStateStatus } from 'react-native';

export interface TransactionIntent {
  rawText: string;
  amount: string;
  source: 'notification' | 'sms' | 'whatsapp' | 'manual';
  sender?: string;
}

let pendingIntent: TransactionIntent | null = null;

function parseIntent(url: string): TransactionIntent | null {
  try {
    if (!url.includes('finance-core://transaction')) return null;
    const parsed = Linking.parse(url);
    const params = parsed.queryParams ?? {};
    const text = decodeURIComponent((params.text as string) ?? '');
    const amount = decodeURIComponent((params.amount as string) ?? '');
    if (!text && !amount) return null;
    return {
      rawText: text,
      amount,
      source: (params.source as TransactionIntent['source']) ?? 'notification',
      sender: params.sender as string | undefined,
    };
  } catch {
    return null;
  }
}

export function useTransactionIntent() {
  const [intent, setIntent] = useState<TransactionIntent | null>(null);

  useEffect(() => {
    // Consume any pending intent captured before mount
    if (pendingIntent) {
      setIntent(pendingIntent);
      pendingIntent = null;
    }

    // Handle URL when app is already open
    const sub = Linking.addEventListener('url', (event) => {
      const parsed = parseIntent(event.url);
      if (parsed) setIntent(parsed);
    });

    // Handle initial URL (app opened by tapping notification)
    Linking.getInitialURL().then((url) => {
      if (url) {
        const parsed = parseIntent(url);
        if (parsed) setIntent(parsed);
      }
    });

    return () => sub.remove();
  }, []);

  const clearIntent = () => setIntent(null);

  return { intent, clearIntent };
}

// Call this early (before React tree mounts) to capture initial intent
export function captureInitialIntent() {
  Linking.getInitialURL().then((url) => {
    if (url) {
      const parsed = parseIntent(url);
      if (parsed) pendingIntent = parsed;
    }
  });
}
