import AsyncStorage from '@react-native-async-storage/async-storage';

export async function safeGet<T = unknown>(key: string, fallback: T | null = null): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
  } catch {
    return fallback;
  }
}

export async function safeGetRaw(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function safeSet(key: string, value: unknown): Promise<boolean> {
  try {
    const v = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, v);
    return true;
  } catch {
    return false;
  }
}

export async function safeRemove(key: string): Promise<void> {
  try { await AsyncStorage.removeItem(key); } catch {}
}
