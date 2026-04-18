import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

const ACCEPTED_SCHEMES = ['financecore', 'finance-core'];
const ACCEPTED_HOSTS = ['pilar-financeiro.replit.app', 'financecore.app'];

/**
 * Mapeia URLs externas para rotas internas do expo-router.
 * Padrões suportados (path-only):
 *   /transaction/<id>
 *   /bill/<id>
 *   /card/<cardId>/invoice/<invoiceId>
 *   /goal/<id>
 *   /alert/<id>  →  /(more)/custom-alerts
 */
function urlToInternalPath(rawUrl: string): string | null {
  try {
    const parsed = Linking.parse(rawUrl);
    const scheme = (parsed.scheme || '').toLowerCase();
    const hostname = (parsed.hostname || '').toLowerCase();

    const isOurScheme = ACCEPTED_SCHEMES.includes(scheme);
    const isOurHost = ACCEPTED_HOSTS.includes(hostname);
    if (!isOurScheme && !isOurHost) return null;

    const segments = (parsed.path || '').split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const [a, b, c, d] = segments;

    if (a === 'transaction' && b) return `/transaction/${b}`;
    if (a === 'bill' && b) return `/bill/${b}`;
    if (a === 'goal' && b) return `/goal/${b}`;
    if (a === 'card' && b && c === 'invoice' && d) return `/card/${b}?invoice=${d}`;
    if (a === 'card' && b) return `/card/${b}`;
    if (a === 'alert' && b) return `/(more)/custom-alerts?id=${b}`;
    if (a === 'investment' && b) return `/investment/${b}`;
    if (a === 'account' && b) return `/account/${b}`;

    return null;
  } catch {
    return null;
  }
}

function navigateTo(path: string) {
  try { router.push(path as any); } catch {}
}

export function useDeepLinks() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;

    Linking.getInitialURL().then((url) => {
      if (cancelled || !url) return;
      const path = urlToInternalPath(url);
      if (path) {
        // Pequeno delay para garantir que o root layout terminou de montar
        setTimeout(() => navigateTo(path), 250);
      }
    }).catch(() => {});

    const sub = Linking.addEventListener('url', (event) => {
      const path = urlToInternalPath(event.url);
      if (path) navigateTo(path);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
}
