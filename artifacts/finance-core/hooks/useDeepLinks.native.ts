import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { applyReferralCode } from '@/services/referral';

const ACCEPTED_SCHEMES = ['financecore', 'finance-core'];
const ACCEPTED_HOSTS = ['pilar-financeiro.replit.app', 'financecore.app'];

const PENDING_REF_KEY = 'pf_pending_referral_v1';
const APPLIED_REF_KEY = 'pf_applied_referral_v1';

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

/** Extrai o parâmetro `ref` (case-insensitive) de uma URL bruta. */
function extractRef(rawUrl: string): string | null {
  try {
    const parsed = Linking.parse(rawUrl);
    const params = parsed.queryParams || {};
    for (const k of Object.keys(params)) {
      if (k.toLowerCase() === 'ref') {
        const v = params[k];
        const code = Array.isArray(v) ? v[0] : v;
        if (typeof code === 'string' && code.trim()) return code.trim();
      }
    }
  } catch {}
  return null;
}

async function rememberRef(code: string) {
  try { await AsyncStorage.setItem(PENDING_REF_KEY, code); } catch {}
}

function appliedKeyFor(userId: string | null | undefined): string {
  return userId ? `${APPLIED_REF_KEY}:${userId}` : APPLIED_REF_KEY;
}

async function tryApplyPendingRef(userId: string | null | undefined): Promise<boolean> {
  try {
    const code = await AsyncStorage.getItem(PENDING_REF_KEY);
    if (!code) return false;
    const appliedKey = appliedKeyFor(userId);
    const already = await AsyncStorage.getItem(appliedKey);
    if (already) {
      await AsyncStorage.removeItem(PENDING_REF_KEY);
      return true;
    }
    const r = await applyReferralCode(code);
    // O backend pode responder ok=true ou já-aplicado via mensagem.
    const alreadyMsg = typeof r?.message === 'string' && /j[áa]\s*aplicad/i.test(r.message);
    if (r?.ok || alreadyMsg) {
      await AsyncStorage.setItem(appliedKey, code);
      await AsyncStorage.removeItem(PENDING_REF_KEY);
      return true;
    }
    return false;
  } catch {
    // silencioso — backend pode estar offline; tentaremos de novo na próxima oportunidade
    return false;
  }
}

export function useDeepLinks() {
  const { isAuthenticated, user } = useAuth();
  const userId = (user as any)?.id ?? null;
  const tickRef = useRef(0);
  const applyingRef = useRef(false);
  const [pendingTick, setPendingTick] = useState(0);

  // 1. Captura links de navegação + ?ref=
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let mounted = true;
    let initialTimer: ReturnType<typeof setTimeout> | null = null;

    const handleUrl = (url: string) => {
      const code = extractRef(url);
      if (code) {
        rememberRef(code).then(() => {
          if (!mounted) return;
          // Sinaliza ao efeito de aplicação que há (potencialmente) algo novo a tentar
          tickRef.current += 1;
          setPendingTick(tickRef.current);
        }).catch(() => {});
      }
      const path = urlToInternalPath(url);
      if (path) navigateTo(path);
    };

    Linking.getInitialURL().then((url) => {
      if (!mounted || !url) return;
      // Pequeno delay para garantir que o root layout terminou de montar
      initialTimer = setTimeout(() => {
        if (mounted) handleUrl(url);
      }, 250);
    }).catch(() => {});

    const sub = Linking.addEventListener('url', (event) => {
      if (mounted) handleUrl(event.url);
    });

    return () => {
      mounted = false;
      if (initialTimer) clearTimeout(initialTimer);
      sub.remove();
    };
  }, []);

  // 2. Aplica o `ref` pendente sempre que (a) o usuário se autentica, ou
  //    (b) chega um novo deep link com ref enquanto autenticado.
  //    Lock in-flight evita chamadas concorrentes ao backend.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      if (applyingRef.current) return;
      applyingRef.current = true;
      try {
        const ok = await tryApplyPendingRef(userId);
        if (cancelled) return;
        // Se falhou (ex.: rede offline), não marcamos nada — tentaremos de novo
        // na próxima mudança de pendingTick / login.
        if (!ok) return;
      } finally {
        applyingRef.current = false;
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, userId, pendingTick]);
}
