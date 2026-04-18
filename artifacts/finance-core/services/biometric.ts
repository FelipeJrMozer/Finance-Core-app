import * as LocalAuth from 'expo-local-authentication';
import { Platform } from 'react-native';
import { safeGet, safeSet } from '@/utils/storage';

const KEY_ENABLED = 'biometric:enabled';

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const hasHw = await LocalAuth.hasHardwareAsync();
    if (!hasHw) return false;
    return await LocalAuth.isEnrolledAsync();
  } catch {
    return false;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await safeGet<string>(KEY_ENABLED)) === 'true';
}

export async function setBiometricEnabled(v: boolean): Promise<void> {
  await safeSet(KEY_ENABLED, String(v));
}

export async function authenticateBiometric(reason = 'Desbloqueie para acessar suas finanças'): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const res = await LocalAuth.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
      fallbackLabel: 'Usar PIN',
    });
    return res.success;
  } catch {
    return false;
  }
}
