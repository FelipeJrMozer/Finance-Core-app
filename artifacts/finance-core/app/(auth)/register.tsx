import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function RegisterScreen() {
  const { theme, colors } = useTheme();
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
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
            label="Criar Conta" onPress={handleRegister}
            loading={loading} fullWidth size="lg" testID="register-button"
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
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center', marginTop: 16 },
  footerText: { fontSize: 15 },
  link: { fontSize: 15 },
});
