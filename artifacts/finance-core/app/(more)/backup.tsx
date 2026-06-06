import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Share, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { fetchBackupJson, fetchBackupPdf } from '@/services/backup';

type ExportFormat = 'json' | 'pdf';

const FORMAT_OPTIONS: { id: ExportFormat; label: string; desc: string; icon: string; color: string }[] = [
  { id: 'json', label: 'JSON', desc: 'Formato completo para reimportação', icon: 'code', color: '#3B82F6' },
  { id: 'pdf', label: 'PDF', desc: 'Relatório legível para visualização', icon: 'file-text', color: '#EF4444' },
];

export default function BackupScreen() {
  const { theme, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      if (selectedFormat === 'json') {
        const data = await fetchBackupJson();
        const str = JSON.stringify(data, null, 2);
        const fileName = `pilar-backup-${new Date().toISOString().substring(0, 10)}.json`;
        await Share.share({ message: str, title: `Backup Pilar — ${fileName}` });
      } else {
        const result = await fetchBackupPdf();
        if (!result.ok) {
          Alert.alert('Atenção', result.message);
          return;
        }
        if (Platform.OS === 'web' && result.blob) {
          const url = URL.createObjectURL(result.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pilar-backup-${Date.now()}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        } else if (result.uri) {
          await Share.share({ url: result.uri, title: 'Backup Pilar — PDF' });
        }
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível exportar os dados.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1420'] : ['#EBF8FF', '#F5F7FA']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={[s.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Backup e Exportação</Text>
        <Text style={[s.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Exporte seus dados financeiros com segurança
        </Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
      >
        <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Formato de Exportação</Text>
          {FORMAT_OPTIONS.map((fmt) => (
            <Pressable
              key={fmt.id}
              onPress={() => setSelectedFormat(fmt.id)}
              style={[s.fmtRow, {
                borderColor: selectedFormat === fmt.id ? fmt.color : theme.border,
                backgroundColor: selectedFormat === fmt.id ? `${fmt.color}10` : 'transparent',
              }]}
            >
              <View style={[s.fmtIcon, { backgroundColor: `${fmt.color}20` }]}>
                <Feather name={fmt.icon as any} size={18} color={fmt.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.fmtLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{fmt.label}</Text>
                <Text style={[s.fmtDesc, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{fmt.desc}</Text>
              </View>
              <View style={[s.radio, { borderColor: selectedFormat === fmt.id ? fmt.color : theme.border }]}>
                {selectedFormat === fmt.id && <View style={[s.radioDot, { backgroundColor: fmt.color }]} />}
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleExport}
          disabled={exporting}
          style={({ pressed }) => [s.exportBtn, { backgroundColor: colors.primary, opacity: pressed || exporting ? 0.75 : 1 }]}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="download" size={18} color="#fff" />
              <Text style={[s.exportText, { fontFamily: 'Inter_600SemiBold' }]}>
                Exportar como {selectedFormat.toUpperCase()}
              </Text>
            </>
          )}
        </Pressable>

        <View style={[s.infoCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
          <Feather name="info" size={15} color={colors.primary} />
          <Text style={[s.infoText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            O backup em JSON contém todas as suas transações, contas, metas, orçamentos e configurações.
            Guarde-o em local seguro.
          </Text>
        </View>

        <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>O que está incluído</Text>
          {[
            { icon: 'repeat', label: 'Todas as transações (receitas e despesas)' },
            { icon: 'briefcase', label: 'Contas bancárias e saldos' },
            { icon: 'credit-card', label: 'Cartões de crédito e faturas' },
            { icon: 'trending-up', label: 'Portfólio de investimentos' },
            { icon: 'target', label: 'Metas e orçamentos' },
            { icon: 'settings', label: 'Configurações e preferências' },
          ].map((item) => (
            <View key={item.label} style={s.includeRow}>
              <View style={[s.includeIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Feather name={item.icon as any} size={14} color={colors.primary} />
              </View>
              <Text style={[s.includeText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 4 },
  title: { fontSize: 26 },
  subtitle: { fontSize: 14 },
  card: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  cardTitle: { fontSize: 15 },
  fmtRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  fmtIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  fmtLabel: { fontSize: 14 },
  fmtDesc: { fontSize: 12, marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14 },
  exportText: { color: '#fff', fontSize: 16 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  includeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  includeIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  includeText: { fontSize: 13 },
});
