import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, ActivityIndicator, TextInput, Linking,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { exportUserData, deleteAccount as apiDeleteAccount } from '@/services/userPrivacy';
import { postConsent, getMyConsents, ConsentRecord } from '@/services/legal';
import { useLegalVersions } from '@/hooks/useLegalVersions';

export default function LgpdScreen() {
  const { theme, colors } = useTheme();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: legal } = useLegalVersions();

  const [marketing, setMarketing] = useState<boolean>(false);
  const [loadingMarketing, setLoadingMarketing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const consents: ConsentRecord[] = await getMyConsents();
        if (!active) return;
        const m = consents.find((c) => c.type === 'marketing');
        setMarketing(!!m?.accepted);
      } catch {
        // silencioso
      }
    })();
    return () => { active = false; };
  }, []);

  const toggleMarketing = async (next: boolean) => {
    Haptics.selectionAsync();
    setMarketing(next);
    setLoadingMarketing(true);
    try {
      await postConsent({ type: 'marketing', accepted: next });
    } catch (e) {
      setMarketing(!next);
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível atualizar a preferência.');
    } finally {
      setLoadingMarketing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await exportUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Exportação concluída',
        r.shared
          ? 'Seus dados foram exportados em formato JSON.'
          : 'Arquivo gerado em ' + (r.uri || 'pasta do app') + '.',
      );
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível exportar os dados.');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== 'EXCLUIR MINHA CONTA') {
      Alert.alert('Confirmação inválida', 'Digite exatamente EXCLUIR MINHA CONTA para confirmar.');
      return;
    }
    setDeleting(true);
    try {
      await apiDeleteAccount({ confirmation: 'EXCLUIR MINHA CONTA' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Conta excluída',
        'Sua conta e seus dados foram removidos. Você será desconectado.',
        [{ text: 'OK', onPress: async () => { await logout(); router.replace('/(auth)/login'); } }],
      );
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível excluir a conta.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
    >
      <Stack.Screen options={{ title: 'Privacidade e LGPD' }} />

      {/* Documentos */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Documentos</Text>
        <Pressable
          onPress={() => router.push('/(more)/legal-terms')}
          style={[styles.row, { borderColor: theme.border }]}
          testID="link-terms"
        >
          <Feather name="file-text" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>Termos de Uso</Text>
            {legal?.terms?.version && (
              <Text style={[styles.rowSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Versão atual v{legal.terms.version}
              </Text>
            )}
          </View>
          <Feather name="chevron-right" size={16} color={theme.textTertiary} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/(more)/legal-privacy')}
          style={[styles.row, { borderColor: theme.border }]}
          testID="link-privacy"
        >
          <Feather name="shield" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>Política de Privacidade</Text>
            {legal?.privacy?.version && (
              <Text style={[styles.rowSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Versão atual v{legal.privacy.version}
              </Text>
            )}
          </View>
          <Feather name="chevron-right" size={16} color={theme.textTertiary} />
        </Pressable>
      </View>

      {/* Comunicações */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Comunicações</Text>
        <View style={[styles.row, { borderColor: theme.border }]}>
          <Feather name="mail" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>E-mails de marketing</Text>
            <Text style={[styles.rowSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Novidades, dicas e ofertas
            </Text>
          </View>
          {loadingMarketing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={marketing}
              onValueChange={toggleMarketing}
              trackColor={{ false: '#555', true: colors.primary }}
              thumbColor="#fff"
              testID="marketing-toggle"
            />
          )}
        </View>
      </View>

      {/* Sessões */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Segurança</Text>
        <Pressable
          onPress={() => router.push('/(more)/sessions')}
          style={[styles.row, { borderColor: theme.border }]}
          testID="link-sessions"
        >
          <Feather name="monitor" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>Dispositivos e sessões</Text>
            <Text style={[styles.rowSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Veja onde sua conta está conectada
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={theme.textTertiary} />
        </Pressable>
      </View>

      {/* Direitos do titular */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Seus dados</Text>
        <Pressable
          onPress={handleExport}
          style={[styles.row, { borderColor: theme.border }]}
          testID="export-data"
          disabled={exporting}
        >
          <Feather name="download" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
              Exportar meus dados (JSON)
            </Text>
            <Text style={[styles.rowSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Baixe uma cópia completa das suas informações
            </Text>
          </View>
          {exporting ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </Pressable>

        <Pressable
          onPress={() => setShowDelete((v) => !v)}
          style={[styles.row, { borderColor: theme.border }]}
          testID="delete-account-toggle"
        >
          <Feather name="trash-2" size={18} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
              Excluir minha conta
            </Text>
            <Text style={[styles.rowSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Apagar permanentemente sua conta e seus dados
            </Text>
          </View>
          <Feather name={showDelete ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textTertiary} />
        </Pressable>

        {showDelete && (
          <View style={[styles.deleteBox, { backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}40` }]}>
            <Text style={[styles.deleteWarn, { color: colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
              Atenção: ação irreversível
            </Text>
            <Text style={[styles.deleteBody, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Após a exclusão você perderá acesso permanente a transações, contas, investimentos, metas e todos os seus dados.
              Para confirmar, digite <Text style={{ fontFamily: 'Inter_700Bold', color: theme.text }}>EXCLUIR MINHA CONTA</Text> abaixo.
            </Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="Digite EXCLUIR MINHA CONTA"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="characters"
              testID="confirm-delete-input"
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_500Medium' }]}
            />
            <Pressable
              onPress={handleDelete}
              disabled={deleting || confirmText.trim().toUpperCase() !== 'EXCLUIR MINHA CONTA'}
              style={({ pressed }) => [
                styles.deleteBtn,
                {
                  backgroundColor: colors.danger,
                  opacity: deleting || confirmText.trim().toUpperCase() !== 'EXCLUIR MINHA CONTA' ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
              testID="confirm-delete"
            >
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.deleteBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Excluir conta permanentemente</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textTertiary, fontFamily: 'Inter_600SemiBold' }]}>
          Encarregado de Dados (DPO)
        </Text>
        <Text style={[styles.rowSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular', marginBottom: 8 }]}>
          Para dúvidas sobre o tratamento dos seus dados pessoais ou para exercer seus direitos pela LGPD,
          entre em contato com nosso Encarregado de Proteção de Dados.
        </Text>
        <Pressable
          onPress={() => Linking.openURL('mailto:privacidade@financecore.com.br?subject=LGPD%20%E2%80%93%20Solicita%C3%A7%C3%A3o%20do%20titular')}
          style={({ pressed }) => [{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
            backgroundColor: `${colors.primary}15`,
            opacity: pressed ? 0.8 : 1,
          }]}
          testID="dpo-email-link"
        >
          <Feather name="mail" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
            privacidade@financecore.com.br
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  cardTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 15 },
  rowSub: { fontSize: 12, marginTop: 1 },
  deleteBox: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10, marginTop: 6 },
  deleteWarn: { fontSize: 14 },
  deleteBody: { fontSize: 13, lineHeight: 18 },
  input: { borderRadius: 10, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15 },
  deleteBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontSize: 15 },
});
