import { randomUUID } from "crypto";

export interface PendingTransaction {
  id: string;
  source: "whatsapp" | "sms" | "manual";
  rawText: string;
  fromNumber?: string;
  parsedAt: string;
  amount: number;
  type: "expense" | "income";
  description: string;
  merchant?: string;
  category: string;
  bank?: string;
  status: "pending" | "approved" | "rejected";
}

const store = new Map<string, PendingTransaction>();

export function addPending(data: Omit<PendingTransaction, "id" | "status" | "parsedAt">): PendingTransaction {
  const tx: PendingTransaction = {
    ...data,
    id: randomUUID(),
    parsedAt: new Date().toISOString(),
    status: "pending",
  };
  store.set(tx.id, tx);
  return tx;
}

export function listPending(): PendingTransaction[] {
  return Array.from(store.values())
    .filter((t) => t.status === "pending")
    .sort((a, b) => b.parsedAt.localeCompare(a.parsedAt));
}

export function approvePending(id: string): PendingTransaction | null {
  const tx = store.get(id);
  if (!tx) return null;
  tx.status = "approved";
  store.set(id, tx);
  return tx;
}

export function rejectPending(id: string): PendingTransaction | null {
  const tx = store.get(id);
  if (!tx) return null;
  tx.status = "rejected";
  store.set(id, tx);
  return tx;
}

export function getPending(id: string): PendingTransaction | null {
  return store.get(id) ?? null;
}
