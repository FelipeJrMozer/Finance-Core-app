import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Switch, Alert, TextInput, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ACCENT_PRESETS, AccentId } from '@/constants/colors';

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
  icon, label, subtitle, right, danger = false, onPress
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  danger?: boolean;
  onPress?: () => void;
}) {
  const { theme, colors } = useTheme();
  return (
    <Pressable
      onPress={() => { if (onPress) { Haptics.selectionAsync(); onPress(); } }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }
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

export default function SettingsScreen() {
  const {
    theme, colors, isDark, themeMode, setThemeMode,
    accentId, setAccentColor,
    valuesVisible, toggleValuesVisible,
    notifyDARF, notifyBudget, notifyWeekly, setNotifySetting,
  } = useTheme();
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');

  const handleSaveName = () => {
    if (nameInput.trim()) {
      updateUser({ name: nameInput.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditingName(false);
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
            Alert.alert('Concluído', 'Dados removidos. Reinicie o app para ver o estado inicial.');
          }
        }
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32, gap: 4 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1A14'] : ['#F0FFF4', '#F5F7FA']}
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
              <Pressable onPress={() => setEditingName(false)} style={[styles.nameBtn, { borderColor: theme.border }]}>
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
          </View>
        )}
      </LinearGradient>

      <View style={styles.content}>
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
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>Cor do Sistema</Text>
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
                      transform: [{ scale: selected ? 1.15 : 1 }],
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
            subtitle="Exibe pontos ao invés de valores"
            value={!valuesVisible}
            onChange={() => toggleValuesVisible()}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ToggleRow
            icon="lock"
            label="Autenticação Biométrica"
            subtitle="Requer Face ID ou impressão digital"
            value={false}
            onChange={() => Alert.alert('Em breve', 'Esta funcionalidade será adicionada em uma próxima atualização.')}
          />
        </View>

        {/* Notifications */}
        <SectionTitle title="Notificações" />
        <View style={[styles.group, { borderColor: theme.border }]}>
          <ToggleRow
            icon="bell"
            label="Alertas de DARF"
            subtitle="Lembrete de vencimento de DARF"
            value={notifyDARF}
            onChange={(v) => setNotifySetting('notifyDARF', v)}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ToggleRow
            icon="bar-chart-2"
            label="Alertas de Orçamento"
            subtitle="Avisa quando ultrapassar 80% do limite"
            value={notifyBudget}
            onChange={(v) => setNotifySetting('notifyBudget', v)}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ToggleRow
            icon="calendar"
            label="Resumo Semanal"
            subtitle="Relatório de gastos toda segunda-feira"
            value={notifyWeekly}
            onChange={(v) => setNotifySetting('notifyWeekly', v)}
          />
        </View>

        {/* Integrations */}
        <SectionTitle title="Integrações" />
        <View style={[styles.group, { borderColor: theme.border }]}>
          <SettingsRow
            icon="link"
            label="Conectar Banco"
            subtitle="Open Finance • Em breve"
            onPress={() => Alert.alert('Open Finance', 'Integração com bancos via Open Finance chegando em breve!')}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="trending-up"
            label="Corretora"
            subtitle="Importar carteira automaticamente • Em breve"
            onPress={() => Alert.alert('Corretora', 'Importação automática de carteira chegando em breve!')}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="cloud"
            label="Sincronizar com Web"
            subtitle={`API: ${process.env.EXPO_PUBLIC_API_URL || 'Modo demo (sem API)'}`}
            onPress={() => Alert.alert('Sincronização', 'Configure EXPO_PUBLIC_API_URL para sincronizar com o servidor web.')}
          />
        </View>

        {/* Data */}
        <SectionTitle title="Dados e Exportação" />
        <View style={[styles.group, { borderColor: theme.border }]}>
          <SettingsRow
            icon="download"
            label="Exportar CSV"
            subtitle="Exportar transações em planilha"
            onPress={() => Alert.alert('Exportar', 'Funcionalidade de exportação CSV em desenvolvimento.')}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="upload-cloud"
            label="Backup na Nuvem"
            subtitle="Salvar dados com segurança"
            onPress={() => Alert.alert('Backup', 'Backup em nuvem chegando em breve!')}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="trash-2"
            label="Limpar Dados"
            subtitle="Remove todas as transações e configurações"
            danger
            onPress={handleClearData}
          />
        </View>

        {/* About */}
        <SectionTitle title="Sobre" />
        <View style={[styles.group, { borderColor: theme.border }]}>
          <SettingsRow icon="info" label="Versão do App" subtitle="Finance Core v1.0.0" />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="file-text"
            label="Termos de Uso"
            onPress={() => Alert.alert('Termos', 'Termos de uso disponíveis em breve.')}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="shield"
            label="Política de Privacidade"
            onPress={() => Alert.alert('Privacidade', 'Política de privacidade disponível em breve.')}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="star"
            label="Avaliar o App"
            onPress={() => Alert.alert('Obrigado!', 'Sua avaliação é muito importante para nós.')}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28, alignItems: 'center', gap: 16 },
  avatarXL: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
  },
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
  nameEdit: { width: '100%', gap: 12, paddingHorizontal: 8 },
  nameInput: {
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 18, textAlign: 'center',
  },
  nameActions: { flexDirection: 'row', gap: 10 },
  nameBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    borderWidth: 1,
  },
  nameBtnText: { fontSize: 15 },
  content: { padding: 16, gap: 8 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, paddingTop: 8, paddingBottom: 4, paddingHorizontal: 4 },
  card: { borderRadius: 16, padding: 16, gap: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 15 },
  themeOptions: { flexDirection: 'row', gap: 8 },
  themeOpt: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  themeOptText: { fontSize: 13 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  colorItem: { width: '22%', alignItems: 'center', gap: 6 },
  colorSwatch: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  colorLabel: { fontSize: 11, textAlign: 'center' },
  group: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15 },
  rowSub: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginLeft: 62 },
});
