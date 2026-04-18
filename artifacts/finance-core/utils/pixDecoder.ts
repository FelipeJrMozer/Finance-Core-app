// EMV BR Code (Pix) decoder. Decodes Tag-Length-Value structure per BCB padrão.
// Returns null if the input is not a valid Pix BR Code.

export interface DecodedPix {
  merchantName?: string;
  city?: string;
  amount?: number; // BRL
  txid?: string;
  key?: string; // chave Pix dentro de tag 26
}

interface TLV {
  tag: string;
  value: string;
}

function parseTLVs(input: string): { tlvs: TLV[]; consumedAll: boolean } {
  const out: TLV[] = [];
  let i = 0;
  while (i < input.length) {
    if (i + 4 > input.length) return { tlvs: out, consumedAll: false };
    const tag = input.slice(i, i + 2);
    const lenStr = input.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(lenStr)) return { tlvs: out, consumedAll: false };
    const len = parseInt(lenStr, 10);
    if (Number.isNaN(len)) return { tlvs: out, consumedAll: false };
    const value = input.slice(i + 4, i + 4 + len);
    if (value.length !== len) return { tlvs: out, consumedAll: false };
    out.push({ tag, value });
    i += 4 + len;
  }
  return { tlvs: out, consumedAll: true };
}

// CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — padrão EMV BR Code (tag 63)
function crc16(input: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      else crc = (crc << 1) & 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function findTag(tlvs: TLV[], tag: string): string | undefined {
  return tlvs.find((t) => t.tag === tag)?.value;
}

export function isPixCode(code: string): boolean {
  if (!code) return false;
  const c = code.trim();
  return /^00020[01]/.test(c) && /BR\.GOV\.BCB\.PIX/i.test(c);
}

export function decodePixCode(code: string): DecodedPix | null {
  if (!code || !isPixCode(code)) return null;
  try {
    const trimmed = code.trim();
    const { tlvs, consumedAll } = parseTLVs(trimmed);
    if (!consumedAll || tlvs.length === 0) return null;

    // CRC16 obrigatório (tag 63, sempre 4 chars hex no final do payload)
    const crcTag = tlvs[tlvs.length - 1];
    if (crcTag.tag !== '63' || crcTag.value.length !== 4) return null;
    // O CRC é calculado sobre tudo até "6304" inclusive
    const crcStartIdx = trimmed.lastIndexOf('6304');
    if (crcStartIdx === -1) return null;
    const expected = crc16(trimmed.slice(0, crcStartIdx + 4));
    if (expected !== crcTag.value.toUpperCase()) return null;

    const result: DecodedPix = {};

    // Tag 26 -> Merchant Account Information (Pix)
    const tag26 = findTag(tlvs, '26');
    if (tag26) {
      const inner = parseTLVs(tag26);
      const key = findTag(inner.tlvs, '01');
      if (key) result.key = key.trim();
    }

    // Tag 54 -> Transaction Amount
    const amtStr = findTag(tlvs, '54');
    if (amtStr) {
      const num = parseFloat(amtStr);
      if (!Number.isNaN(num) && num > 0) result.amount = num;
    }

    // Tag 59 -> Merchant Name
    const name = findTag(tlvs, '59');
    if (name) result.merchantName = name.trim();

    // Tag 60 -> Merchant City
    const city = findTag(tlvs, '60');
    if (city) result.city = city.trim();

    // Tag 62 -> Additional Data (txid em 05)
    const tag62 = findTag(tlvs, '62');
    if (tag62) {
      const inner = parseTLVs(tag62);
      const txid = findTag(inner.tlvs, '05');
      if (txid) result.txid = txid.trim();
    }

    // Pelo menos um dado útil deve ter sido extraído
    if (!result.key && !result.merchantName && !result.amount && !result.txid) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
}

// NFe key: 44 numeric digits (with optional NFe prefix or extra spaces)
export function extractNFeKey(code: string): string | null {
  if (!code) return null;
  const match = code.replace(/\s+/g, '').match(/(\d{44})/);
  return match ? match[1] : null;
}
