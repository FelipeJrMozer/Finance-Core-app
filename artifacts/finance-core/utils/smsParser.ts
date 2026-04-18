export interface ParsedSms {
  bank?: string;
  amount?: number;
  type?: 'expense' | 'income';
  description?: string;
  cardLast4?: string;
}

// Locale-aware: aceita tanto "1.234,56" (BR) quanto "1234.56" (US/decimal puro).
// Regra: se houver vírgula, ela é o separador decimal e os pontos são milhar.
// Caso contrário, se houver apenas um ponto e ≤2 dígitos após, é decimal;
// vários pontos são tratados como separador de milhar.
export function parseBRL(s: string): number {
  if (!s) return NaN;
  const cleaned = s.replace(/[^\d.,-]/g, '');
  if (!cleaned) return NaN;
  let normalized: string;
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount <= 1) {
      // Único ponto: é decimal apenas se houver no máx. 2 dígitos depois
      const idx = cleaned.indexOf('.');
      const after = idx >= 0 ? cleaned.length - idx - 1 : 0;
      normalized = idx === -1 || after <= 2 ? cleaned : cleaned.replace(/\./g, '');
    } else {
      normalized = cleaned.replace(/\./g, '');
    }
  }
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? NaN : n;
}

interface Pattern {
  bank: string;
  type: 'expense' | 'income';
  regex: RegExp;
  map: (m: RegExpMatchArray) => Partial<ParsedSms>;
}

const PATTERNS: Pattern[] = [
  // Pix recebido (any bank)
  {
    bank: 'Pix',
    type: 'income',
    regex: /pix.*?recebido.*?R\$\s?([\d.,]+).*?de\s+([^\.\n]+)/i,
    map: (m) => ({ amount: parseBRL(m[1]), description: `Pix de ${m[2].trim()}` }),
  },
  // Pix enviado/realizado (any bank)
  {
    bank: 'Pix',
    type: 'expense',
    regex: /pix.*?(?:enviado|realizado).*?R\$\s?([\d.,]+).*?para\s+([^\.\n]+)/i,
    map: (m) => ({ amount: parseBRL(m[1]), description: `Pix para ${m[2].trim()}` }),
  },
  // Nubank
  {
    bank: 'Nubank',
    type: 'expense',
    regex: /Compra aprovada.*?R\$\s?([\d.,]+).*?em\s+([^\.\n]+?)(?:\.|\s+em\s)/i,
    map: (m) => ({ amount: parseBRL(m[1]), description: m[2].trim() }),
  },
  // Itaú
  {
    bank: 'Itaú',
    type: 'expense',
    regex: /compra.*?R\$\s?([\d.,]+).*?cart[aã]o\s+final\s+(\d{4})/i,
    map: (m) => ({ amount: parseBRL(m[1]), cardLast4: m[2] }),
  },
  // Bradesco/Santander/genérico cartão de crédito
  {
    bank: 'Cartão',
    type: 'expense',
    regex: /(?:compra|transa[cç][aã]o).*?R\$\s?([\d.,]+).*?(?:no|em)\s+([A-Z][A-Z0-9 ]{2,30})/,
    map: (m) => ({ amount: parseBRL(m[1]), description: m[2].trim() }),
  },
  // Débito genérico
  {
    bank: 'Débito',
    type: 'expense',
    regex: /(?:d[eé]bito|saque|pagamento).*?R\$\s?([\d.,]+)/i,
    map: (m) => ({ amount: parseBRL(m[1]) }),
  },
  // Crédito recebido genérico (salário, transferência)
  {
    bank: 'Crédito',
    type: 'income',
    regex: /(?:cr[eé]dito|recebido|deposit[oa]|transfer[eê]ncia recebida).*?R\$\s?([\d.,]+)/i,
    map: (m) => ({ amount: parseBRL(m[1]) }),
  },
];

export function parseBankSms(text: string): ParsedSms | null {
  if (!text) return null;
  for (const p of PATTERNS) {
    const m = text.match(p.regex);
    if (m) {
      const partial = p.map(m);
      if (partial.amount && !Number.isNaN(partial.amount) && partial.amount > 0) {
        return { bank: p.bank, type: p.type, ...partial };
      }
    }
  }
  return null;
}
