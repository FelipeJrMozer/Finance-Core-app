import { apiGet, apiPost, apiPut, apiDelete } from '@/services/api';

export type RuleMatchType = 'contains' | 'starts' | 'equals' | 'regex';

export interface CategorizationRule {
  id: string;
  pattern: string;
  matchType: RuleMatchType;
  categoryId?: string;
  category?: string;
  active?: boolean;
  priority?: number;
  createdAt?: string;
}

export interface RuleTestResult {
  matched: boolean;
  rule?: CategorizationRule;
}

export async function listRules(): Promise<CategorizationRule[]> {
  const data = await apiGet<CategorizationRule[] | { rules: CategorizationRule[] }>(
    '/api/categorization-rules'
  );
  if (Array.isArray(data)) return data;
  return data?.rules || [];
}

export async function createRule(input: Omit<CategorizationRule, 'id'>): Promise<CategorizationRule> {
  return apiPost('/api/categorization-rules', input);
}

export async function updateRule(
  id: string,
  input: Partial<Omit<CategorizationRule, 'id'>>
): Promise<CategorizationRule> {
  return apiPut(`/api/categorization-rules/${encodeURIComponent(id)}`, input);
}

export async function deleteRule(id: string): Promise<void> {
  await apiDelete(`/api/categorization-rules/${encodeURIComponent(id)}`);
}

export async function testRule(text: string): Promise<RuleTestResult> {
  return apiPost<RuleTestResult>('/api/categorization-rules/test', { text });
}
