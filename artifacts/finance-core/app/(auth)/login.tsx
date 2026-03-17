import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const { theme, colors, isDark } = useTheme();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Preencha e-mail e senha');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e instanceof Error ? e.message : 'Credenciais inválidas';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LinearGradient
            colors={[colors.primaryGlow, 'transparent']}
            style={styles.iconGlow}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
              <Feather name="trending-up" size={32} color="#000" />
            </View>
          </LinearGradient>
          <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
            Pilar Financeiro
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Controle total das suas finanças
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            testID="email-input"
            label="E-mail"
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail"
          />
          <Input
            testID="password-input"
            label="Senha"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            placeholder="Sua senha"
            secureTextEntry
            icon="lock"
          />

          {error ? (
            <View
              testID="login-error"
              style={[styles.errorBox, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}40` }]}
            >
              <Feather name="alert-circle" size={15} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <Button
            testID="login-button"
            label="Entrar"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Não tem uma conta?
          </Text>
          <Pressable
            testID="register-link"
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={[styles.link, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
              Criar conta
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 32 },
  header: { alignItems: 'center', gap: 12 },
  iconGlow: { padding: 20, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  iconContainer: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 32 },
  subtitle: { fontSize: 16, textAlign: 'center' },
  form: { gap: 16 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  errorText: { fontSize: 14, flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center' },
  footerText: { fontSize: 15 },
  link: { fontSize: 15 },
});
