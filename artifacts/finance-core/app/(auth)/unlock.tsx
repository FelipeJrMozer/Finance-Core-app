import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function UnlockScreen() {
  const { theme, colors } = useTheme();
  const { unlock, logout, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [trying, setTrying] = useState(false);
  const [failed, setFailed] = useState(false);

  const tryUnlock = useCallback(async () => {
    setTrying(true);
    setFailed(false);
    const ok = await unlock();
    setTrying(false);
    if (ok) {
      router.replace('/(tabs)');
    } else {
      setFailed(true);
    }
  }, [unlock]);

  useEffect(() => {
    tryUnlock();
  }, [tryUnlock]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}20` }]}>
        <Feather name="lock" size={42} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>App bloqueado</Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        {user?.name ? `Olá, ${user.name.split(' ')[0]}.` : ''} Confirme sua identidade para continuar.
      </Text>

      {trying && (
        <View style={{ marginTop: 24 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {failed && (
        <Text style={[styles.error, { color: colors.danger }]}>
          Não foi possível autenticar.
        </Text>
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
          <Text style={styles.primaryBtnText}>Tentar novamente</Text>
        </Pressable>

        <Pressable
          onPress={logout}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Sair</Text>
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
  title: { fontSize: 22, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  sub: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', maxWidth: 280 },
  error: { marginTop: 16, fontSize: 14, fontFamily: 'Inter_500Medium' },
  actions: { width: '100%', marginTop: 'auto', gap: 12 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  secondaryBtn: {
    paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
