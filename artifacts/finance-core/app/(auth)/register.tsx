import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useLegalVersions } from '@/hooks/useLegalVersions';
import { buildLegalUrl } from '@/services/legal';
import { BrandLogo } from '@/components/BrandLogo';

function CheckRow({
  checked,
  onToggle,
  children,
  testID,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  testID?: string;
}) {
  const { theme, colors } = useTheme();
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onToggle(); }}
      style={styles.checkRow}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? colors.primary : 'transparent',
            borderColor: checked ? colors.primary : theme.border,
          },
        ]}
      >
        {checked && <Feather name="check" size={14} color="#fff" />}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

export default function RegisterScreen() {
  const { theme, colors } = useTheme();
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: legal, isLoading: legalLoading, error: legalError, refetch } = useLegalVersions();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const consentReady = !!legal?.terms?.version && !!legal?.privacy?.version;
  const formValid =
    !!name.trim() &&
    !!email.trim() &&
    password.length >= 6 &&
    termsAccepted &&
    privacyAccepted &&
    consentReady;

  const handleOpenLegal = async (kind: 'terms' | 'privacy') => {
    if (!legal) return;
    const url = buildLegalUrl(kind === 'terms' ? legal.terms.url : legal.privacy.url);
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      // fallback silencioso
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!consentReady || !legal) {
      setError('Não foi possível carregar os documentos legais. Tente novamente.');
      return;
    }
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (!termsAccepted || !privacyAccepted) {
      setError('Aceite os Termos de Uso e a Política de Privacidade');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, {
        termsAccepted: true,
        privacyAccepted: true,
        termsVersion: legal.terms.version,
        privacyVersion: legal.privacy.version,
        marketingAccepted,
      });
      router.replace('/(tabs)');
    } catch (e: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e instanceof Error ? e.message : 'Erro ao criar conta';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', gap: 8, marginTop: insets.top + 8, marginBottom: 8 }}>
          <BrandLogo size={48} showWordmark wordmarkSize={20} testID="brand-register" />
        </View>
        <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          Criar sua conta
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Comece a controlar suas finanças hoje
        </Text>

        <View style={styles.form}>
          <Input
            label="Nome completo" value={name}
            onChangeText={(v) => { setName(v); setError(''); }}
            placeholder="Seu nome" icon="user" testID="name-input"
          />
          <Input
            label="E-mail" value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            placeholder="seu@email.com" keyboardType="email-address"
            autoCapitalize="none" icon="mail" testID="email-input"
          />
          <Input
            label="Senha" value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            placeholder="Mínimo 6 caracteres" secureTextEntry icon="lock" testID="password-input"
          />

          {/* Consentimentos LGPD */}
          <View style={styles.consentBlock}>
            {legalLoading && (
              <View style={styles.consentLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: theme.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 12 }}>
                  Carregando termos…
                </Text>
              </View>
            )}
            {legalError && (
              <Pressable onPress={() => refetch()} style={styles.consentRetry}>
                <Feather name="refresh-cw" size={13} color={colors.warning} />
                <Text style={{ color: colors.warning, fontFamily: 'Inter_500Medium', fontSize: 12 }}>
                  Não foi possível carregar termos. Tocar para tentar novamente.
                </Text>
              </Pressable>
            )}

            <CheckRow
              checked={termsAccepted}
              onToggle={() => setTermsAccepted((v) => !v)}
              testID="terms-checkbox"
            >
              <Text style={[styles.consentText, { color: theme.text, fontFamily: 'Inter_400Regular' }]}>
                Li e aceito os{' '}
                <Text
                  onPress={() => handleOpenLegal('terms')}
                  style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}
                >
                  Termos de Uso
                </Text>
                {legal?.terms?.version ? (
                  <Text style={[styles.versionTag, { color: theme.textTertiary }]}>
                    {' '}(v{legal.terms.version})
                  </Text>
                ) : null}
              </Text>
            </CheckRow>

            <CheckRow
              checked={privacyAccepted}
              onToggle={() => setPrivacyAccepted((v) => !v)}
              testID="privacy-checkbox"
            >
              <Text style={[styles.consentText, { color: theme.text, fontFamily: 'Inter_400Regular' }]}>
                Li e aceito a{' '}
                <Text
                  onPress={() => handleOpenLegal('privacy')}
                  style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}
                >
                  Política de Privacidade
                </Text>
                {legal?.privacy?.version ? (
                  <Text style={[styles.versionTag, { color: theme.textTertiary }]}>
                    {' '}(v{legal.privacy.version})
                  </Text>
                ) : null}
              </Text>
            </CheckRow>

            <CheckRow
              checked={marketingAccepted}
              onToggle={() => setMarketingAccepted((v) => !v)}
              testID="marketing-checkbox"
            >
              <Text style={[styles.consentText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Quero receber novidades e dicas por e-mail (opcional)
              </Text>
            </CheckRow>
          </View>

          {error ? (
            <View
              testID="register-error"
              style={[styles.errorBox, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}40` }]}
            >
              <Feather name="alert-circle" size={15} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <Button
            label="Criar Conta"
            onPress={handleRegister}
            loading={loading}
            disabled={!formValid}
            fullWidth
            size="lg"
            testID="register-button"
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Já tem uma conta?
          </Text>
          <Text
            style={[styles.link, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}
            onPress={() => router.back()}
          >
            Entrar
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, gap: 16 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 15, marginBottom: 8 },
  form: { gap: 16 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  errorText: { fontSize: 14, flex: 1 },
  consentBlock: { gap: 12, marginTop: 4 },
  consentLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  consentRetry: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  consentText: { fontSize: 13, lineHeight: 19 },
  versionTag: { fontSize: 11 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center', marginTop: 16 },
  footerText: { fontSize: 15 },
  link: { fontSize: 15 },
});
