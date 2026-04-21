import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Share, Alert, TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import {
  getMyReferralCode, applyReferralCode, listReferrals,
  ReferralInfo, ReferralListItem,
} from '@/services/referral';

export default function ReferralScreen() {
  const { theme, colors } = useTheme();
  const qc = useQueryClient();
  const [applyCode, setApplyCode] = useState('');

  const code = useQuery<ReferralInfo>({
    queryKey: ['/api/referral/my-code'],
    queryFn: getMyReferralCode,
    staleTime: 60_000,
  });

  const list = useQuery<ReferralListItem[]>({
    queryKey: ['/api/referral/list'],
    queryFn: listReferrals,
    staleTime: 30_000,
  });

  const applyMut = useMutation({
    mutationFn: (c: string) => applyReferralCode(c),
    onSuccess: (r) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Indicação aplicada', r.message || 'Código aplicado com sucesso!');
      setApplyCode('');
      qc.invalidateQueries({ queryKey: ['/api/referral/list'] });
    },
    onError: (e) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível aplicar o código.');
    },
  });

  const share = async () => {
    if (!code.data) return;
    const url = code.data.shareUrl || `https://pilar-financeiro.replit.app/?ref=${code.data.code}`;
    try {
      await Share.share({
        message: `Conheça o Pilar Financeiro — controle suas finanças com inteligência. Use meu código ${code.data.code}: ${url}`,
        url,
      });
    } catch {}
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: 'Programa de Indicação' }} />

      {/* Hero com código */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroLabel}>SEU CÓDIGO DE INDICAÇÃO</Text>
        {code.isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : code.error ? (
          <Text style={styles.heroError}>Erro ao carregar código</Text>
        ) : (
          <>
            <Text style={styles.heroCode} testID="referral-code">{code.data?.code || '—'}</Text>
            <Text style={styles.heroSub}>
              Compartilhe e ganhe benefícios quando seus indicados se cadastrarem.
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{code.data?.totalReferrals ?? 0}</Text>
                <Text style={styles.statLbl}>Indicados</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{code.data?.convertedReferrals ?? 0}</Text>
                <Text style={styles.statLbl}>Convertidos</Text>
              </View>
            </View>
            <Pressable onPress={share} style={styles.shareBtn} testID="share-referral">
              <Feather name="share-2" size={16} color={colors.primary} />
              <Text style={[styles.shareBtnText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                Compartilhar
              </Text>
            </Pressable>
          </>
        )}
      </LinearGradient>

      {/* Aplicar código de outra pessoa */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Tem um código de indicação?
        </Text>
        <Text style={[styles.cardSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Aplique para garantir o benefício no seu cadastro.
        </Text>
        <View style={styles.applyRow}>
          <TextInput
            value={applyCode}
            onChangeText={(v) => setApplyCode(v.toUpperCase())}
            placeholder="DIGITE O CÓDIGO"
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="characters"
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_500Medium', flex: 1 }]}
            testID="apply-code-input"
          />
          <Pressable
            onPress={() => applyMut.mutate(applyCode.trim())}
            disabled={applyMut.isPending || !applyCode.trim()}
            style={[styles.applyBtn, { backgroundColor: colors.primary, opacity: applyMut.isPending || !applyCode.trim() ? 0.55 : 1 }]}
            testID="apply-code-button"
          >
            {applyMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Aplicar</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Lista */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Suas indicações</Text>
        {list.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (list.data && list.data.length > 0) ? (
          list.data.map((r) => (
            <View key={r.id} style={[styles.listRow, { borderColor: theme.border }]} testID={`referral-${r.id}`}>
              <View style={[styles.listIcon, { backgroundColor: r.status === 'converted' ? `${colors.primary}20` : `${colors.warning}20` }]}>
                <Feather
                  name={r.status === 'converted' ? 'check-circle' : 'clock'}
                  size={16}
                  color={r.status === 'converted' ? colors.primary : colors.warning}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.listLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
                  {r.name || r.email || 'Indicado'}
                </Text>
                <Text style={[styles.listSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  {r.status === 'converted' ? 'Conta criada' : r.status === 'rejected' ? 'Recusado' : 'Aguardando cadastro'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={{ color: theme.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 13 }}>
            Nenhuma indicação ainda. Compartilhe seu código!
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 18, padding: 20, alignItems: 'center', gap: 8 },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, letterSpacing: 1.2, fontFamily: 'Inter_600SemiBold' },
  heroCode: { color: '#fff', fontSize: 36, letterSpacing: 4, fontFamily: 'Inter_700Bold', marginVertical: 6 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: 8, fontFamily: 'Inter_400Regular' },
  heroError: { color: '#fff', fontSize: 14, marginTop: 8 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  statBox: { alignItems: 'center' },
  statSep: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.4)' },
  statNum: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'Inter_400Regular' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 12 },
  shareBtnText: { fontSize: 14 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  cardTitle: { fontSize: 14 },
  cardSub: { fontSize: 13, lineHeight: 18 },
  applyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  input: { borderRadius: 10, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15 },
  applyBtn: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  listIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  listLabel: { fontSize: 14 },
  listSub: { fontSize: 12, marginTop: 1 },
});
