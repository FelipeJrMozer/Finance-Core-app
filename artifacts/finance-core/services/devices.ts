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
