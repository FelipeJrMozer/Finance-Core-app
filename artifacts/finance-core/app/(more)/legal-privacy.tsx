import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/context/ThemeContext';
import { useLegalVersions } from '@/hooks/useLegalVersions';
import { buildLegalUrl } from '@/services/legal';

export default function LegalPrivacyScreen() {
  const { theme, colors } = useTheme();
  const { data, isLoading, error, refetch } = useLegalVersions();

  const open = async () => {
    if (!data) return;
    await WebBrowser.openBrowserAsync(buildLegalUrl(data.privacy.url));
  };

  const mailDpo = async () => {
    if (!data?.dpoEmail) return;
    const url = `mailto:${data.dpoEmail}?subject=${encodeURIComponent('Direitos LGPD — Pilar Financeiro')}`;
    await WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Política de Privacidade' }} />
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-triangle" size={28} color={colors.warning} />
          <Text style={[styles.errorText, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
            Não foi possível carregar a política.
          </Text>
          <Pressable onPress={() => refetch()} style={[styles.retry, { borderColor: colors.primary }]}>
            <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : data ? (
        <View style={styles.box}>
          <Feather name="shield" size={36} color={colors.primary} />
          <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
            Política de Privacidade
          </Text>
          <Text style={[styles.version, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Versão atual: <Text style={{ color: theme.text, fontFamily: 'Inter_600SemiBold' }}>v{data.privacy.version}</Text>
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            A Política completa está publicada no site oficial.{' '}
            {Platform.OS === 'web' ? 'Toque para abrir em uma nova aba.' : 'Toque para abrir no navegador.'}
          </Text>
          <Pressable
            onPress={open}
            style={[styles.cta, { backgroundColor: colors.primary }]}
            testID="open-privacy"
          >
            <Feather name="external-link" size={16} color="#fff" />
            <Text style={[styles.ctaText, { fontFamily: 'Inter_600SemiBold' }]}>Abrir Política</Text>
          </Pressable>

          {data.dpoEmail && (
            <Pressable onPress={mailDpo} style={[styles.dpoBtn, { borderColor: theme.border }]} testID="contact-dpo">
              <Feather name="mail" size={14} color={theme.textSecondary} />
              <Text style={[styles.dpoText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                Falar com o DPO ({data.dpoEmail})
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { alignItems: 'center', gap: 12, maxWidth: 360 },
  title: { fontSize: 22, marginTop: 4 },
  version: { fontSize: 13 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginTop: 8 },
  ctaText: { color: '#fff', fontSize: 15 },
  dpoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  dpoText: { fontSize: 13 },
  errorBox: { alignItems: 'center', gap: 12 },
  errorText: { fontSize: 15, textAlign: 'center' },
  retry: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1 },
});
