import { Platform } from 'react-native';
import { apiGet, apiPost, apiDelete } from './api';

let lastRegisteredToken: string | null = null;

export type DevicePlatform = 'ios' | 'android' | 'web';

export interface RegisteredDevice {
  id: string;
  platform?: string;
  deviceModel?: string;
  token?: string;
  createdAt?: string;
  lastActiveAt?: string;
  current?: boolean;
}

export function currentDevicePlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

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

export async function registerPushTokenWithBackend(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Constants: any = (await import('expo-constants')).default;
    const Device: any = await import('expo-device').catch(() => null);
    if (!Device || Device.isDevice === false) return;
    if (Constants?.appOwnership === 'expo') return;

    const Notifications: any = await import('expo-notifications').catch(() => null);
    if (!Notifications) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

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

export async function listDevices(): Promise<RegisteredDevice[]> {
  try {
    const data = await apiGet<RegisteredDevice[] | { devices?: RegisteredDevice[]; data?: RegisteredDevice[] }>('/api/devices');
    if (Array.isArray(data)) return data;
    return (data as any).devices ?? (data as any).data ?? [];
  } catch {
    return [];
  }
}

export async function removeDevice(id: string): Promise<boolean> {
  try {
    await apiDelete(`/api/devices/${id}`);
    return true;
  } catch {
    return false;
  }
}
