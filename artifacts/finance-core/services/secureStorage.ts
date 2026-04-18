import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

// SecureStore não funciona em web; AsyncStorage como fallback (web não é alvo de prod, mas evita crash).
const isWeb = Platform.OS === 'web';

export async function setSecure(key: string, value: string): Promise<void> {
  try {
    if (isWeb) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    logger.warn('[secureStorage] setSecure failed', { key });
  }
}

export async function getSecure(key: string): Promise<string | null> {
  try {
    if (isWeb) return await AsyncStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function deleteSecure(key: string): Promise<void> {
  try {
    if (isWeb) {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {}
}

/**
 * One-shot migration: move tokens previously stored in AsyncStorage (plain text)
 * to SecureStore (Keychain/Keystore). Idempotent — safe to call on every boot.
 */
export async function migrateTokensIfNeeded(legacyKeyMap: Record<string, string>): Promise<void> {
  if (isWeb) return;
  for (const [legacyKey, secureKey] of Object.entries(legacyKeyMap)) {
    try {
      const legacy = await AsyncStorage.getItem(legacyKey);
      if (!legacy) continue;
      const existing = await SecureStore.getItemAsync(secureKey);
      if (!existing) {
        await SecureStore.setItemAsync(secureKey, legacy, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      }
      await AsyncStorage.removeItem(legacyKey);
      logger.debug('[secureStorage] migrated', legacyKey, '→', secureKey);
    } catch {
      // best-effort; leave legacy untouched if it fails
    }
  }
}
