import { Platform } from 'react-native';
import { apiPost } from './api';

let lastRegisteredToken: string | null = null;

export type DevicePlatform = 'ios' | 'android' | 'web';

export function currentDevicePlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Registra o token de push no backend. Deduplica chamadas com o mesmo token na sessão.
 */
export async function registerPushToken(token: string): Promise<void> {
  if (!token) return;
  if (token === lastRegisteredToken) return;
  try {
    await apiPost('/api/devices/register', {
      token,
      platform: currentDevicePlatform(),
    });
    lastRegisteredToken = token;
  } catch {
    // Silenciar — endpoint não crítico para uso do app
  }
}

export function resetRegisteredPushToken() {
  lastRegisteredToken = null;
}

/**
 * Obtém o Expo Push Token (formato esperado pelo backend para enviar
 * notificações via Expo Push API) e o registra. Idempotente por sessão.
 * No-op em web ou Expo Go (necessita projectId e dev build).
 */
export async function registerPushTokenWithBackend(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Constants: any = (await import('expo-constants')).default;
    const Device: any = await import('expo-device').catch(() => null);
    if (!Device || Device.isDevice === false) return;
    if (Constants?.appOwnership === 'expo') return; // Expo Go não suporta push tokens reais

    const Notifications: any = await import('expo-notifications').catch(() => null);
    if (!Notifications) return;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResp?.data;
    if (token) await registerPushToken(String(token));
  } catch (err) {
    console.warn('[Push] Falha ao registrar token:', err);
  }
}
