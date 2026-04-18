import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

export default function SmsImportHelpScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const steps = Platform.OS === 'android' ? [
    'Abra o app de SMS, copie a mensagem do banco (segurar → Copiar).',
    'Volte ao Pilar Financeiro e abra "Importar SMS" no menu Mais.',
    'O app detecta automaticamente o conteúdo da área de transferência.',
    'Confira os dados extraídos e toque em "Confirmar e lançar".',
    'Dica: também é possível usar Compartilhar → Pilar Financeiro em alguns lançadores.',
  ] : [
    'No iOS, o sistema não permite compartilhar SMS diretamente para apps de finanças.',
    'Copie o SMS no app Mensagens (segurar → Copiar) e abra "Importar SMS" — o app detecta o clipboard.',
    'Use também o atalho "Escanear Pix/QR" para capturar QRs.',
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 16 }}
    >
      <Stack.Screen options={{ title: 'Importar via SMS' }} />

      <View style={[styles.hero, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
        <Feather name="info" size={20} color={colors.primary} />
        <Text style={[styles.heroText, { color: theme.text, fontFamily: 'Inter_400Regular' }]}>
          O Pilar Financeiro nunca lê seus SMS automaticamente. Você decide quais mensagens importar
          compartilhando-as com o app — é mais seguro e respeita as regras da Play Store.
        </Text>
      </View>

      <Text style={[styles.section, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
        Passo a passo
      </Text>
      {steps.map((s, i) => (
        <View key={i} style={[styles.step, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#000', fontFamily: 'Inter_700Bold' }}>{i + 1}</Text>
          </View>
          <Text style={[styles.stepText, { color: theme.text, fontFamily: 'Inter_400Regular' }]}>{s}</Text>
        </View>
      ))}

      <Text style={[styles.section, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
        Bancos suportados
      </Text>
      <View style={[styles.banksCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {['Pix (qualquer banco)', 'Nubank', 'Itaú', 'Bradesco', 'Santander', 'Mensagens genéricas de cartão / débito']
          .map((b) => (
            <View key={b} style={styles.bankRow}>
              <Feather name="check" size={14} color={colors.primary} />
              <Text style={[styles.bankText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{b}</Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  heroText: { flex: 1, fontSize: 13, lineHeight: 19 },
  section: { fontSize: 14, marginTop: 8 },
  step: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, fontSize: 13, lineHeight: 19 },
  banksCard: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bankText: { fontSize: 13 },
});
