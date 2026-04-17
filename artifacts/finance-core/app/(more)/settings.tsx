import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Switch, Alert, TextInput, Platform, Share, ActivityIndicator, Linking
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useFinance } from '@/context/FinanceContext';
import { ACCENT_PRESETS, AccentId } from '@/constants/colors';
import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
} from '@/services/NotificationService';

type ThemeMode = 'system' | 'light' | 'dark';

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'system', label: 'Auto', icon: 'smartphone' },
  { id: 'light', label: 'Claro', icon: 'sun' },
  { id: 'dark', label: 'Escuro', icon: 'moon' },
];

function SectionTitle({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
      {title.toUpperCase()}
    </Text>
  );
}

function SettingsRow({
  icon, label, subtitle, right, danger = false, onPress, disabled = false
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  danger?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { theme, colors } = useTheme();
  return (
    <Pressable
      onPress={() => { if (!disabled && onPress) { Haptics.selectionAsync(); onPress(); } }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1
        }
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? `${colors.danger}15` : `${colors.primary}15` }]}>
        <Feather name={icon} size={18} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: danger ? colors.danger : theme.text, fontFamily: 'Inter_500Medium' }]}>
          {label}
        </Text>
        {subtitle && (
          <Text style={[styles.rowSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={16} color={theme.textTertiary} /> : null)}
    </Pressable>
  );
}

function ToggleRow({
  icon, label, subtitle, value, onChange
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <SettingsRow
      icon={icon}
      label={label}
      subtitle={subtitle}
      right={
        <Switch
          value={value}
          onValueChange={(v) => { Haptics.selectionAsync(); onChange(v); }}
          trackColor={{ false: '#555', true: colors.primary }}
          thumbColor="#fff"
        />
      }
    />
  );
}

function SyncBadge() {
  const { isSyncingColors, colors } = useTheme();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
  if (!apiUrl) {
    return (
      <View style={[styles.syncBadge, { backgroundColor: '#FF980020' }]}>
        <Feather name="cloud-off" size={11} color="#FF9800" />
        <Text style={[styles.syncText, { color: '#FF9800' }]}>Modo offline</Text>
      </View>
    );
  }
  if (isSyncingColors) {
    return (
      <View style={[styles.syncBadge, { backgroundColor: `${colors.primary}20` }]}>
        <ActivityIndicator size={10} color={colors.primary} />
        <Text style={[styles.syncText, { color: colors.primary }]}>Sincronizando…</Text>
      </View>
    );
  }
  return (
    <View style={[styles.syncBadge, { backgroundColor: `${colors.primary}20` }]}>
      <Feather name="cloud" size={11} color={colors.primary} />
      <Text style={[styles.syncText, { color: colors.primary }]}>Sincronizado com web</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const {
    theme, colors, isDark, themeMode, setThemeMode,
    accentId, setAccentColor,
    valuesVisible, toggleValuesVisible,
    notifyDARF, notifyBudget, notifyWeekly, setNotifySetting,
  } = useTheme();
  const { user, updateUser } = useAuth();
  const { transactions, accounts, investments } = useFinance();
  const insets = useSafeAreaInsets();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [notifPermission, setNotifPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';

  useEffect(() => {
    getNotificationPermissionStatus().then(setNotifPermission);
  }, []);

  const handleNotifToggle = async (key: 'notifyDARF' | 'notifyBudget' | 'notifyWeekly', value: boolean) => {
    if (value && notifPermission !== 'granted') {
      const granted = await requestNotificationPermissions();
      setNotifPermission(granted ? 'granted' : 'denied');
      if (!granted) {
        Alert.alert(
          'Permissão Negada',
          'Para receber notificações, acesse Configurações do dispositivo e habilite as notificações para o Pilar Financeiro.',
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Abrir Configurações', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }
    setNotifySetting(key, value);
    Haptics.selectionAsync();
  };

  const handleSaveName = () => {
    if (nameInput.trim()) {
      updateUser({ name: nameInput.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditingName(false);
  };

  const handleExportCSV = async () => {
    const header = 'Data,Descrição,Tipo,Categoria,Valor,Conta\n';
    const rows = transactions
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((t) => {
        const account = accounts.find((a) => a.id === t.accountId)?.name || '';
        return `${t.date},"${t.description}",${t.type === 'income' ? 'Receita' : 'Despesa'},${t.category},${t.amount.toFixed(2)},"${account}"`;
      })
      .join('\n');

    const csv = header + rows;
    try {
      await Share.share({
        message: csv,
        title: 'Pilar Financeiro — Exportação de Transações',
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar os dados.');
    }
  };

  const handleExportJSON = async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'Pilar Financeiro',
      version: '1.0.0',
      user: user ? { name: user.name, email: user.email, plan: user.plan } : null,
      counts: { transactions: transactions.length, accounts: accounts.length, investments: investments.length },
      transactions,
      accounts,
      investments,
    };
    try {
      await Share.share({
        message: JSON.stringify(payload, null, 2),
        title: 'Pilar Financeiro — Backup JSON',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar o backup.');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Limpar Dados',
      'Isso irá remover todas as transações, contas e configurações. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar Tudo', style: 'destructive', onPress: async () => {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const keys = ['fc_transactions', 'fc_accounts', 'fc_credit_cards', 'fc_investments', 'fc_budgets', 'fc_goals', 'fc_darfs'];
            await Promise.all(keys.map((k: string) => AsyncStorage.removeItem(k)));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Concluído', 'Dados removidos. Reinicie o app para carregar o estado inicial.');
          }
        }
      ]
    );
  };

  const currentPreset = ACCENT_PRESETS.find(p => p.id === accentId) ?? ACCENT_PRESETS[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40, gap: 4 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#091520'] : ['#EBF8FF', '#F5F7FA']}
        style={styles.profileCard}
      >
        <View style={[styles.avatarXL, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarLetter, { fontFamily: 'Inter_700Bold' }]}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>

        {editingName ? (
          <View style={styles.nameEdit}>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              style={[styles.nameInput, { color: theme.text, borderColor: colors.primary, fontFamily: 'Inter_500Medium' }]}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <View style={styles.nameActions}>
              <Pressable onPress={() => setEditingName(false)} style={[styles.nameBtn, { borderColor: theme.border, borderWidth: 1 }]}>
                <Text style={[styles.nameBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleSaveName} style={[styles.nameBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.nameBtnText, { color: '#000', fontFamily: 'Inter_600SemiBold' }]}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Pressable onPress={() => setEditingName(true)} style={styles.nameRow}>
              <Text style={[styles.profileName, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                {user?.name || 'Usuário'}
              </Text>
              <Feather name="edit-2" size={14} color={colors.primary} />
            </Pressable>
            <Text style={[styles.profileEmail, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {user?.email}
            </Text>
            {user?.plan && (
              <View style={[styles.planBadge, { backgroundColor: colors.primaryGlow }]}>
                <Feather name="star" size={11} color={colors.primary} />
                <Text style={[styles.planText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                  Plano {user.plan}
                </Text>
              </View>
            )}
            <SyncBadge />
          </View>
        )}
      </LinearGradient>

      <View style={styles.content}>
        {/* Web Color Sync Info */}
        {apiUrl ? (
          <View style={[styles.syncInfo, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
            <Feather name="refresh-cw" size={14} color={colors.primary} />
            <Text style={[styles.syncInfoText, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>
              Cor sincronizada com o sistema web — quando você troca a cor no web, o app atualiza automaticamente a cada 30s.
            </Text>
          </View>
        ) : (
          <View style={[styles.syncInfo, { backgroundColor: '#FF980012', borderColor: '#FF980030' }]}>
            <Feather name="cloud-off" size={14} color="#FF9800" />
            <Text style={[styles.syncInfoText, { color: '#FF9800', fontFamily: 'Inter_400Regular' }]}>
              Configure EXPO_PUBLIC_API_URL para sincronizar a cor com o sistema web.
            </Text>
          </View>
        )}

        {/* Appearance */}
        <SectionTitle title="Aparência" />

        {/* Theme */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Feather name="moon" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>Tema</Text>
          </View>
          <View style={styles.themeOptions}>
            {THEME_OPTIONS.map(opt => (
              <Pressable
                key={opt.id}
                onPress={() => { setThemeMode(opt.id); Haptics.selectionAsync(); }}
                style={[
                  styles.themeOpt,
                  {
                    backgroundColor: themeMode === opt.id ? colors.primary : theme.surfaceElevated,
                    borderColor: themeMode === opt.id ? colors.primary : theme.border,
                  }
                ]}
              >
                <Feather name={opt.icon} size={16} color={themeMode === opt.id ? '#000' : theme.textSecondary} />
                <Text style={[
                  styles.themeOptText,
                  { color: themeMode === opt.id ? '#000' : theme.textSecondary, fontFamily: 'Inter_500Medium' }
                ]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Accent Color */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Feather name="droplet" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                Tema de Cores
              </Text>
              <Text style={[styles.cardSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                {currentPreset.label} — {currentPreset.desc}
              </Text>
            </View>
          </View>
          <View style={styles.colorGrid}>
            {ACCENT_PRESETS.map(preset => {
              const selected = accentId === preset.id;
              return (
                <Pressable
                  key={preset.id}
                  onPress={() => { setAccentColor(preset.id as AccentId); Haptics.selectionAsync(); }}
                  style={styles.colorItem}
                >
                  <View style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: preset.primary,
                      borderWidth: selected ? 3 : 0,
                      borderColor: '#fff',
                      transform: [{ scale: selected ? 1.18 : 1 }],
                    }
                  ]}>
                    {selected && <Feather name="check" size={14} color="#000" />}
                  </View>
                  <Text style={[
                    styles.colorLabel,
                    { color: selected ? preset.primary : theme.textTertiary, fontFamily: selected ? 'Inter_600SemiBold' : 'Inter_400Regular' }
                  ]}>
                    {preset.label}
                  </Text>
                  {selected && (
                    <Text style={[styles.inUseLabel, { color: preset.primary, fontFamily: 'Inter_500Medium' }]}>
                      Em uso
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Privacy */}
        <SectionTitle title="Privacidade" />
        <View style={[styles.group, { borderColor: theme.border }]}>
          <ToggleRow
            icon="eye-off"
            label="Ocultar Valores"
            subtitle="Exibe pontos ao invés de valores monetários"
            value={!valuesVisible}
            onChange={() => toggleValuesVisible()}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="lock"
            label="Autenticação Biométrica"
            subtitle="Face ID ou impressão digital — Em breve"
            disabled
          />
        </View>

        {/* Notifications */}
        <SectionTitle title="Notificações" />

        {/* Permission status banner */}
        {Platform.OS !== 'web' && notifPermission !== 'granted' && (
          <Pressable
            onPress={async () => {
              if (notifPermission === 'denied') {
                Linking.openSettings();
              } else {
                const granted = await requestNotificationPermissions();
                setNotifPermission(granted ? 'granted' : 'denied');
              }
            }}
            style={[styles.permBanner, { backgroundColor: notifPermission === 'denied' ? `${colors.danger}12` : `${colors.warning}12`, borderColor: notifPermission === 'denied' ? `${colors.danger}30` : `${colors.warning}30` }]}
          >
            <Feather name={notifPermission === 'denied' ? 'bell-off' : 'bell'} size={16} color={notifPermission === 'denied' ? colors.danger : colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.permTitle, { color: notifPermission === 'denied' ? colors.danger : colors.warning, fontFamily: 'Inter_600SemiBold' }]}>
                {notifPermission === 'denied' ? 'Notificações bloqueadas' : 'Permissão necessária'}
              </Text>
              <Text style={[styles.permSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                {notifPermission === 'denied'
                  ? 'Toque para abrir as Configurações do dispositivo'
                  : 'Toque para habilitar notificações do Pilar Financeiro'}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.textTertiary} />
          </Pressable>
        )}

        {Platform.OS !== 'web' && notifPermission === 'granted' && (
          <View style={[styles.permBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
            <Feather name="check-circle" size={16} color={colors.primary} />
            <Text style={[styles.permTitle, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>Notificações habilitadas</Text>
          </View>
        )}

        <View style={[styles.group, { borderColor: theme.border }]}>
          <ToggleRow
            icon="bell"
            label="Alertas de Contas e Vencimentos"
            subtitle="Lembrete 7 e 3 dias antes do vencimento de faturas"
            value={notifyDARF}
            onChange={(v) => handleNotifToggle('notifyDARF', v)}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ToggleRow
            icon="bar-chart-2"
            label="Alertas de Orçamento"
            subtitle="Avisa ao atingir 80% e 100% do limite mensal"
            value={notifyBudget}
            onChange={(v) => handleNotifToggle('notifyBudget', v)}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ToggleRow
            icon="calendar"
            label="Resumo Semanal"
            subtitle="Relatório de receitas e gastos toda segunda-feira às 9h"
            value={notifyWeekly}
            onChange={(v) => handleNotifToggle('notifyWeekly', v)}
          />
        </View>

        {/* Integrations */}
        <SectionTitle title="Integrações" />
        <View style={[styles.group, { borderColor: theme.border }]}>
          <SettingsRow
            icon="link"
            label="Open Finance"
            subtitle={apiUrl ? 'Conectar banco via API' : 'Configure a API para ativar'}
            onPress={() => Alert.alert(
              'Open Finance',
              apiUrl
                ? `Conectar ao Open Finance via ${apiUrl}\n\nFuncionalidade em desenvolvimento.`
                : 'Configure EXPO_PUBLIC_API_URL para usar integrações bancárias.'
            )}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="trending-up"
            label="Importar Corretora"
            subtitle="Importar carteira automaticamente"
            onPress={() => Alert.alert('Corretora', 'Importe sua carteira de investimentos automaticamente.\n\nFuncionalidade em desenvolvimento — disponível em breve.')}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="cloud"
            label="Status da Sincronização"
            subtitle={apiUrl ? `API: ${apiUrl}` : 'Modo offline (demo)'}
            right={
              <View style={[styles.statusDot, { backgroundColor: apiUrl ? '#00C853' : '#FF9800' }]} />
            }
            onPress={() => Alert.alert(
              'Sincronização Web',
              apiUrl
                ? `Conectado à API: ${apiUrl}\n\nA cor e o tema são sincronizados automaticamente a cada 30 segundos. Ao trocar a cor no sistema web, o app mobile atualiza sozinho.`
                : 'O app está em modo offline (demo).\n\nPara sincronizar com o sistema web, configure a variável EXPO_PUBLIC_API_URL.'
            )}
          />
        </View>

        {/* Data */}
        <SectionTitle title="Dados e Exportação" />
        <View style={[styles.group, { borderColor: theme.border }]}>
          <SettingsRow
            icon="download"
            label="Exportar CSV"
            subtitle={`${transactions.length} transações disponíveis para exportar`}
            onPress={handleExportCSV}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="package"
            label="Exportar Backup (JSON)"
            subtitle="Salvar transações, contas e investimentos"
            onPress={handleExportJSON}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="upload-cloud"
            label="Backup na Nuvem"
            subtitle={apiUrl ? 'Sincronizado com o servidor' : 'Requer conexão com API'}
            disabled={!apiUrl}
            onPress={() => Alert.alert('Backup', 'Backup em nuvem disponível quando conectado à API.')}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="trash-2"
            label="Limpar Todos os Dados"
            subtitle="Remove transações, contas e configurações"
            danger
            onPress={handleClearData}
          />
        </View>

        {/* About */}
        <SectionTitle title="Sobre" />
        <View style={[styles.group, { borderColor: theme.border }]}>
          <SettingsRow
            icon="info"
            label="Versão do App"
            subtitle="Pilar Financeiro v1.0.0 • Build 2026.03"
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="file-text"
            label="Termos de Uso"
            onPress={async () => {
              await WebBrowser.openBrowserAsync('https://financecore.app/terms');
            }}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="shield"
            label="Política de Privacidade"
            onPress={async () => {
              await WebBrowser.openBrowserAsync('https://financecore.app/privacy');
            }}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="star"
            label="Avaliar o App"
            subtitle="Sua avaliação nos ajuda a crescer"
            onPress={() => Alert.alert('Obrigado!', 'Você seria redirecionado para a loja de aplicativos para nos avaliar.')}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28, alignItems: 'center', gap: 16 },
  avatarXL: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 40, color: '#000' },
  profileInfo: { alignItems: 'center', gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileName: { fontSize: 24 },
  profileEmail: { fontSize: 15 },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4
  },
  planText: { fontSize: 13 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  syncText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  nameEdit: { width: '100%', gap: 12, paddingHorizontal: 8 },
  nameInput: {
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 18, textAlign: 'center',
  },
  nameActions: { flexDirection: 'row', gap: 10 },
  nameBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  nameBtnText: { fontSize: 15 },
  content: { padding: 16, gap: 8 },
  syncInfo: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start' },
  syncInfoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, paddingTop: 8, paddingBottom: 4, paddingHorizontal: 4 },
  card: { borderRadius: 16, padding: 16, gap: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { fontSize: 15 },
  cardSub: { fontSize: 12, marginTop: 2 },
  themeOptions: { flexDirection: 'row', gap: 8 },
  themeOpt: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  themeOptText: { fontSize: 13 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' },
  colorItem: { width: '22%', alignItems: 'center', gap: 4 },
  colorSwatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  colorLabel: { fontSize: 10, textAlign: 'center' },
  inUseLabel: { fontSize: 9, textAlign: 'center' },
  group: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15 },
  rowSub: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginLeft: 62 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  permBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 4,
  },
  permTitle: { fontSize: 13 },
  permSub: { fontSize: 11, marginTop: 2 },
});
