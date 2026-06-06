import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

const MAX_ATTEMPTS = 3;

export default function UnlockScreen() {
  const { theme, colors } = useTheme();
  const { unlock, logout, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [trying, setTrying] = useState(false);
  const [failed, setFailed] = useState(false);
  const failCountRef = useRef(0);

  const tryUnlock = useCallback(async () => {
    if (trying) return;
    setTrying(true);
    setFailed(false);
    const ok = await unlock();
    setTrying(false);
    if (ok) {
      failCountRef.current = 0;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } else {
      failCountRef.current += 1;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFailed(true);
      if (failCountRef.current >= MAX_ATTEMPTS) {
        await logout();
      }
    }
  }, [trying, unlock, logout]);

  useEffect(() => {
    tryUnlock();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attemptsLeft = MAX_ATTEMPTS - failCountRef.current;

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}20` }]}>
        <Feather name="lock" size={42} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>App bloqueado</Text>
      <Text style={[styles.sub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
        {user?.name ? `Olá, ${user.name.split(' ')[0]}.` : ''} Confirme sua identidade para continuar.
      </Text>

      {trying && (
        <View style={{ marginTop: 24 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {failed && !trying && (
        <View style={{ marginTop: 16, alignItems: 'center', gap: 4 }}>
          <Text style={[styles.error, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
            Autenticação falhou.
          </Text>
          {attemptsLeft > 0 && (
            <Text style={[styles.attemptsText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              {attemptsLeft === 1
                ? 'Última tentativa antes de sair automaticamente.'
                : `${attemptsLeft} tentativas restantes.`}
            </Text>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={tryUnlock}
          disabled={trying}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.primary, opacity: pressed || trying ? 0.7 : 1 },
          ]}
        >
          <Feather name="unlock" size={18} color="#fff" />
          <Text style={[styles.primaryBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
            {failed ? 'Tentar novamente' : 'Desbloquear'}
          </Text>
        </Pressable>

        <Pressable
          onPress={logout}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>Sair da conta</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  iconWrap: {
    width: 92, height: 92, borderRadius: 46,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  title: { fontSize: 22, marginBottom: 8 },
  sub: { fontSize: 15, textAlign: 'center', maxWidth: 280 },
  error: { fontSize: 14 },
  attemptsText: { fontSize: 12 },
  actions: { width: '100%', marginTop: 'auto', gap: 12 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 15 },
  secondaryBtn: {
    paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15 },
});
