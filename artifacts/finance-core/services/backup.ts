import { Platform } from 'react-native';
import { apiFetch } from './api';

export async function fetchBackupJson(): Promise<any> {
  const res = await apiFetch('/api/backup/json');
  if (!res.ok) {
    const msg = res.status === 401
      ? 'Sessão expirada. Entre novamente para fazer o backup.'
      : `Falha ao gerar backup (HTTP ${res.status}).`;
    throw new Error(msg);
  }
  return await res.json();
}

export type PdfExportResult =
  | { ok: true; uri?: string; blob?: Blob }
  | { ok: false; status: number; message: string };

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let bin = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  if (typeof btoa === 'function') return btoa(bin);
  return '';
}

export async function fetchBackupPdf(): Promise<PdfExportResult> {
  const res = await apiFetch('/api/backup/export-pdf');
  if (res.status === 501) {
    let msg = 'A geração de PDF ainda não está disponível neste servidor. Use o backup em JSON enquanto isso.';
    try {
      const d = await res.json();
      if (d?.message) msg = String(d.message);
    } catch {}
    return { ok: false, status: 501, message: msg };
  }
  if (!res.ok) {
    return { ok: false, status: res.status, message: `Falha ao gerar PDF (HTTP ${res.status}).` };
  }
  if (Platform.OS === 'web') {
    const blob = await res.blob();
    return { ok: true, blob };
  }
  try {
    const FileSystem: any = await import('expo-file-system');
    const arrayBuf = await res.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuf);
    if (!base64) return { ok: false, status: 0, message: 'Falha ao codificar o PDF para salvar.' };
    const fileName = `pilar-backup-${Date.now()}.pdf`;
    const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    const uri = `${baseDir}${fileName}`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    return { ok: true, uri };
  } catch (e: any) {
    return { ok: false, status: 0, message: e?.message || 'Não foi possível salvar o PDF.' };
  }
}
