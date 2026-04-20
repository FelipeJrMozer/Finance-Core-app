import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import {
  openNotificationListenerSettings,
  onAppForeground,
  openWhatsApp,
  SUPPORTED_BANKS,
  WHATSAPP_NUMBER,
} from '@/services/notificationCapture';

export default function CapturaBancariaScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (!requested) return;
    const off = onAppForeground(() => setRequested(false));
    return off;
  }, [requested]);

  if (Platform.OS === 'ios') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 16 }}
      >
        <Stack.Screen options={{ title: 'Captura automática' }} />

        <View style={[styles.hero, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
          <Feather name="info" size={20} color={colors.primary} />
          <Text style={[styles.heroText, { color: theme.text, fontFamily: 'Inter_400Regular' }]}>
            No iPhone, devido a restrições do iOS, a captura automática de notificações
            de bancos não é permitida pela Apple.
          </Text>
        </View>

        <Text style={[styles.section, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          Use o WhatsApp
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardText, { color: theme.text, fontFamily: 'Inter_400Regular' }]}>
            Mande seu gasto em texto, áudio ou foto do comprovante para o número abaixo.
            Em segundos, ele aparece em "Lançamentos Pendentes" pra você confirmar.
          </Text>
          <Text style={[styles.phone, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
            +{WHATSAPP_NUMBER}
          </Text>
          <Pressable
            onPress={async () => {
              Haptics.selectionAsync();
              const ok = await openWhatsApp('Olá, quero registrar um gasto:');
              if (!ok) {
                Alert.alert(
                  'Não foi possível abrir o WhatsApp',
                  `Salve este número manualmente: +${WHATSAPP_NUMBER}`
                );
              }
            }}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: '#25D366', opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="message-circle" size={18} color="#fff" />
            <Text style={[styles.primaryBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
              Abrir WhatsApp
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/(more)/pending-transactions')}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="clock" size={16} color={colors.primary} />
          <Text style={[styles.secondaryBtnText, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
            Ver Lançamentos Pendentes
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 16 }}
    >
      <Stack.Screen options={{ title: 'Captura automática' }} />

      <View style={[styles.hero, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
        <Feather name="zap" size={20} color={colors.primary} />
        <Text style={[styles.heroText, { color: theme.text, fontFamily: 'Inter_400Regular' }]}>
          Para capturar gastos automaticamente, autorize o Pilar Financeiro a ler as
          notificações dos seus apps de banco. Os dados ficam só no seu celular até
          você aprovar cada lançamento.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          Como funciona
        </Text>
        {[
          'Você ativa o acesso a notificações nas configurações do Android.',
          'O app filtra apenas notificações de bancos com valor (R$).',
          'Cada lançamento detectado fica pendente — você confirma ou descarta.',
          'Nada vai pro servidor sem a sua aprovação.',
        ].map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 12 }}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.text, fontFamily: 'Inter_400Regular' }]}>{s}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={async () => {
          Haptics.selectionAsync();
          const ok = await openNotificationListenerSettings();
          if (!ok) {
            Alert.alert(
              'Não foi possível abrir',
              'Abra manualmente: Configurações → Notificações → Acesso a notificações → Pilar Financeiro.'
            );
            return;
          }
          setRequested(true);
        }}
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Feather name="shield" size={18} color="#000" />
        <Text style={[styles.primaryBtnText, { color: '#000', fontFamily: 'Inter_600SemiBold' }]}>
          Ativar captura automática
        </Text>
      </Pressable>

      {requested && (
        <Text style={[styles.hint, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Após ativar, volte ao app. As próximas notificações de bancos serão capturadas.
        </Text>
      )}

      <Text style={[styles.section, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
        Bancos suportados
      </Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {SUPPORTED_BANKS.map((b) => (
          <View key={b.pkg} style={styles.bankRow}>
            <Feather name="check" size={14} color={colors.primary} />
            <Text style={[styles.bankText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {b.name}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/(more)/pending-transactions')}
        style={({ pressed }) => [
          styles.secondaryBtn,
          { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Feather name="clock" size={16} color={colors.primary} />
        <Text style={[styles.secondaryBtnText, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
          Ver Lançamentos Pendentes
        </Text>
      </Pressable>

      <Text style={[styles.disclaimer, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
        Você confirma cada lançamento antes dele virar uma transação real. O acesso pode ser
        revogado a qualquer momento nas configurações do Android.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  heroText: { flex: 1, fontSize: 13, lineHeight: 19 },
  section: { fontSize: 14, marginTop: 8 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 15 },
  cardText: { fontSize: 13, lineHeight: 19 },
  phone: { fontSize: 18, textAlign: 'center', marginVertical: 4 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepText: { flex: 1, fontSize: 13, lineHeight: 19 },
  primaryBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { fontSize: 15, color: '#fff' },
  secondaryBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  secondaryBtnText: { fontSize: 14 },
  hint: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bankText: { fontSize: 13 },
  disclaimer: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 8 },
});
