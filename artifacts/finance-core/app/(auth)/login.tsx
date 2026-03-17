import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert
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
  const [email, setEmail] = useState('demo@financecore.app');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', e.message || 'Credenciais inválidas');
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
            Finance Core
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
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail"
          />
          <Input
            testID="password-input"
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Sua senha"
            secureTextEntry
            icon="lock"
          />

          <Button
            testID="login-button"
            label="Entrar"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
          />

          <View style={styles.demoNote}>
            <Feather name="info" size={14} color={theme.textTertiary} />
            <Text style={[styles.demoText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Modo demo: toque em Entrar sem alterar os campos
            </Text>
          </View>
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
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center' },
  footerText: { fontSize: 15 },
  link: { fontSize: 15 },
  demoNote: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  demoText: { fontSize: 12, flex: 1 },
});
