import { Platform } from 'react-native';
import { apiPost, getApiBaseUrl, getAccessToken } from '@/services/api';

export async function setHideBalances(hideBalances: boolean): Promise<void> {
  try {
    await apiPost('/api/user/hide-balances', { hideBalances });
  } catch {
    // Falha de rede não pode bloquear o toggle local
  }
}

export interface ExportResult {
  uri?: string;
  shared: boolean;
  dataUrl?: string;
}

/**
 * Baixa o JSON em /api/user/export-data e abre o sheet de Compartilhar.
 * No Web, abre como download direto do navegador.
 */
export async function exportUserData(): Promise<ExportResult> {
  const base = getApiBaseUrl();
  const token = getAccessToken();
  const url = `${base}/api/user/export-data`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  if (Platform.OS === 'web') {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Falha ao exportar (HTTP ${res.status})`);
    const blob = await res.blob();
    const dataUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `pilar-financeiro-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(dataUrl), 1000);
    return { shared: true, dataUrl };
  }

  // Native: usa expo-file-system + expo-sharing
  const FS: any = await import('expo-file-system').catch(() => null);
  const Sharing: any = await import('expo-sharing').catch(() => null);
  if (!FS || !Sharing) throw new Error('Recursos de exportação não disponíveis no dispositivo.');

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Falha ao exportar (HTTP ${res.status})`);
  const json = await res.text();

  const fileName = `pilar-financeiro-export-${new Date().toISOString().slice(0, 10)}.json`;
  const directory = FS.documentDirectory || FS.cacheDirectory;
  if (!directory) throw new Error('Sistema de arquivos indisponível.');
  const fileUri = `${directory}${fileName}`;
  await FS.writeAsStringAsync(fileUri, json, { encoding: FS.EncodingType?.UTF8 || 'utf8' });
  const can = await Sharing.isAvailableAsync();
  if (can) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar dados (JSON)',
      UTI: 'public.json',
    });
    return { uri: fileUri, shared: true };
  }
  return { uri: fileUri, shared: false };
}

export async function deleteAccount(input: {
  confirmation: string;
  reason?: string;
}): Promise<void> {
  await apiPost('/api/user/delete-account', input);
}
