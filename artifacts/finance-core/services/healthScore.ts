import { apiGet } from './api';

export interface HealthScoreComponent {
  name: string;
  label?: string;
  score: number;
  max: number;
}

export interface HealthScoreHistoryPoint {
  month: string;
  score: number;
}

export interface HealthScore {
  overallScore: number;
  category: string;
  components: HealthScoreComponent[];
  history: HealthScoreHistoryPoint[];
}

const COMPONENT_LABELS_PT: Record<string, string> = {
  balance: 'Equilíbrio',
  savingsRate: 'Taxa de Poupança',
  budgetCompliance: 'Aderência ao Orçamento',
  debtControl: 'Controle de Dívidas',
};

export function labelForComponent(name: string, fallback?: string): string {
  return COMPONENT_LABELS_PT[name] || fallback || name;
}

export function categoryLabelPT(cat: string): string {
  switch (cat) {
    case 'excellent': return 'Excelente';
    case 'good': return 'Boa';
    case 'fair': return 'Regular';
    case 'poor': return 'Crítica';
    case 'critical': return 'Crítica';
    default: return cat || '—';
  }
}

export async function fetchHealthScore(): Promise<HealthScore | null> {
  try {
    const data = await apiGet<any>('/api/health-score/current');
    if (!data || typeof data !== 'object') return null;
    return {
      overallScore: Number(data.overallScore ?? data.score ?? 0),
      category: String(data.category || 'unknown'),
      components: Array.isArray(data.components)
        ? data.components.map((c: any) => ({
            name: String(c.name || ''),
            label: c.label,
            score: Number(c.score || 0),
            max: Number(c.max || 0),
          }))
        : [],
      history: Array.isArray(data.history)
        ? data.history.map((h: any) => ({
            month: String(h.month || ''),
            score: Number(h.score || 0),
          }))
        : [],
    };
  } catch {
    return null;
  }
}
