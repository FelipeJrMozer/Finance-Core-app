import { apiGet, apiPost } from './api';

export interface MemberBalance {
  memberId: string;
  memberName: string;
  balance: number;
}

export interface Settlement {
  fromMemberId: string;
  fromMemberName?: string;
  toMemberId: string;
  toMemberName?: string;
  amount: number;
}

export interface FamilyBalance {
  memberBalances: MemberBalance[];
  settlements: Settlement[];
}

export async function fetchFamilyBalance(): Promise<FamilyBalance> {
  try {
    const data = await apiGet<any>('/api/family/balance');
    return {
      memberBalances: Array.isArray(data?.memberBalances)
        ? data.memberBalances.map((m: any) => ({
            memberId: String(m.memberId ?? m.id ?? ''),
            memberName: String(m.memberName ?? m.name ?? 'Membro'),
            balance: Number(m.balance ?? 0),
          }))
        : [],
      settlements: Array.isArray(data?.settlements)
        ? data.settlements.map((s: any) => ({
            fromMemberId: String(s.fromMemberId ?? s.from ?? ''),
            fromMemberName: s.fromMemberName,
            toMemberId: String(s.toMemberId ?? s.to ?? ''),
            toMemberName: s.toMemberName,
            amount: Number(s.amount ?? 0),
          }))
        : [],
    };
  } catch {
    return { memberBalances: [], settlements: [] };
  }
}

export async function settleFamilyDebt(
  fromMemberId: string,
  toMemberId: string,
  amount: number,
): Promise<void> {
  await apiPost('/api/family/settle', { fromMemberId, toMemberId, amount });
}
