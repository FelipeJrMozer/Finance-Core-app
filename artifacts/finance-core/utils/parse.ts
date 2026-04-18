/**
 * Tolerant parser for monetary amounts from API or user input.
 * Accepts plain number, "1234.56", "1.234,56" and "1234,56".
 * Returns 0 for any unparseable input.
 */
export function parseAmount(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw !== 'string') return 0;
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  // Treat dots as thousands separators only when comma also present (BR format).
  const hasComma = trimmed.includes(',');
  const normalized = hasComma
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Tolerant parser for ISO date strings. Returns YYYY-MM-DD.
 * Falls back to today's date when input is missing or invalid.
 */
export function parseDate(raw: unknown): string {
  if (typeof raw !== 'string') return todayIso();
  const trimmed = raw.trim();
  if (!trimmed) return todayIso();
  // If already YYYY-MM-DD..., trust the date prefix.
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(trimmed);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : todayIso();
}
