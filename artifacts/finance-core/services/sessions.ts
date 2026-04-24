import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiGet, apiPost, apiDelete } from '@/services/api';
import { setSecure, getSecure } from '@/services/secureStorage';

const DEVICE_ID_KEY = 'pf_device_id';

export interface ActiveSession {
  id: string;
  device?: string;
  os?: string;
  appVersion?: string;
  ip?: string;
  userAgent?: string;
  createdAt?: string;
  lastActiveAt?: string;
  current?: boolean;
}

function uuid(): string {
  // Compact RFC4122-like v4
  const tpl = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return tpl.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getStableDeviceId(): Promise<string> {
  const cached = await getSecure(DEVICE_ID_KEY);
  if (cached) return cached;
  let nativeId: string | null = null;
  try {
    const Device: any = await import('expo-device').catch(() => null);
    nativeId = Device?.osInternalBuildId || Device?.osBuildId || null;
  } catch {}
  const id = nativeId ? `${Platform.OS}-${nativeId}` : uuid();
  await setSecure(DEVICE_ID_KEY, id);
  return id;
}

async function getDeviceLabel(): Promise<string> {
  try {
    const Device: any = await import('expo-device').catch(() => null);
    if (Device?.modelName) return Device.modelName as string;
    if (Device?.deviceName) return Device.deviceName as string;
  } catch {}
  return Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android' : 'Web';
}

export async function trackSession(): Promise<void> {
  try {
    const [deviceId, device] = await Promise.all([
      getStableDeviceId(),
      getDeviceLabel(),
    ]);
    const appVersion =
      (Constants.expoConfig?.version as string) ||
      ((Constants as any).manifest?.version as string) ||
      '1.0.0';
    await apiPost('/api/user/sessions/track', {
      deviceId,
      device,
      os: Platform.OS,
      appVersion,
    });
  } catch {
    // Silent: tracking não pode quebrar login
  }
}

export async function listSessions(): Promise<ActiveSession[]> {
  const data = await apiGet<ActiveSession[] | { sessions: ActiveSession[] }>('/api/user/sessions');
  if (Array.isArray(data)) return data;
  return data?.sessions || [];
}

export async function revokeSession(id: string): Promise<void> {
  await apiDelete(`/api/user/sessions/${encodeURIComponent(id)}`);
}
