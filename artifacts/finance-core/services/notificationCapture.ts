import { Platform, Linking, AppState } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

const NOTIFICATION_LISTENER_SETTINGS_ACTION =
  'android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS';

export async function openNotificationListenerSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    await IntentLauncher.startActivityAsync(NOTIFICATION_LISTENER_SETTINGS_ACTION);
    return true;
  } catch {
    try {
      await Linking.openSettings();
      return true;
    } catch {
      return false;
    }
  }
}

export function onAppForeground(cb: () => void): () => void {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') cb();
  });
  return () => sub.remove();
}

export const SUPPORTED_BANKS = [
  { name: 'Nubank', pkg: 'com.nu.production' },
  { name: 'Itaú', pkg: 'com.itau' },
  { name: 'Bradesco', pkg: 'com.bradesco' },
  { name: 'Santander', pkg: 'com.santander' },
  { name: 'Banco do Brasil', pkg: 'br.com.bb.android' },
  { name: 'Caixa', pkg: 'br.gov.caixa' },
  { name: 'Inter', pkg: 'br.com.intermedium' },
  { name: 'C6 Bank', pkg: 'com.c6bank' },
  { name: 'BTG Pactual', pkg: 'com.btgpactual.personal' },
  { name: 'XP', pkg: 'br.com.xp.cartao' },
  { name: 'Sicredi', pkg: 'com.sicredi' },
  { name: 'PicPay', pkg: 'com.picpay' },
  { name: 'Mercado Pago', pkg: 'com.mercadopago' },
  { name: 'PagSeguro', pkg: 'com.pagseguro' },
  { name: 'Stone', pkg: 'br.com.stone' },
  { name: 'Méliuz', pkg: 'br.com.meliuz' },
];

export const WHATSAPP_NUMBER = (
  process.env.EXPO_PUBLIC_WHATSAPP_NUMBER || '5511999999999'
).replace(/\D/g, '');

export async function openWhatsApp(message?: string): Promise<boolean> {
  if (!WHATSAPP_NUMBER) return false;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  const httpsUrl = `https://wa.me/${WHATSAPP_NUMBER}${text}`;
  const schemeUrl = `whatsapp://send?phone=${WHATSAPP_NUMBER}${
    message ? `&text=${encodeURIComponent(message)}` : ''
  }`;
  try {
    const canScheme = await Linking.canOpenURL(schemeUrl).catch(() => false);
    if (canScheme) {
      await Linking.openURL(schemeUrl);
      return true;
    }
    await Linking.openURL(httpsUrl);
    return true;
  } catch {
    try {
      await Linking.openURL(httpsUrl);
      return true;
    } catch {
      return false;
    }
  }
}
