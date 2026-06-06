import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/context/ThemeContext';
import { apiFetch } from '@/services/api';

type ImportStatus = 'idle' | 'picking' | 'uploading' | 'success' | 'error';

interface ImportResult {
  imported?: number;
  skipped?: number;
  errors?: string[];
  message?: string;
}

const BROKERAGES = [
  { id: 'b3', label: 'B3 — Notas de Corretagem', format: 'PDF / XLS', icon: 'trending-up', color: '#F59E0B' },
  { id: 'xp', label: 'XP Investimentos', format: 'OFX / XLS', icon: 'bar-chart-2', color: '#3B82F6' },
  { id: 'rico', label: 'Rico Investimentos', format: 'OFX', icon: 'dollar-sign', color: '#10B981' },
  { id: 'clear', label: 'Clear Corretora', format: 'CSV / OFX', icon: 'activity', color: '#7B39ED' },
  { id: 'inter', label: 'Banco Inter Invest', format: 'OFX', icon: 'credit-card', color: '#EF4444' },
  { id: 'nu', label: 'Nu Invest (Easynvest)', format: 'OFX / CSV', icon: 'zap', color: '#9C27B0' },
  { id: 'generic', label: 'Genérico OFX', format: 'OFX / QFX', icon: 'upload', color: '#6B7280' },
];

export default function BrokerageImportScreen() {
  const { theme, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedBrokerage, setSelectedBrokerage] = useState<string | null>(null);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handlePick = async () => {
    if (!selectedBrokerage) {
      Alert.alert('Atenção', 'Selecione a corretora/instituição antes de continuar.');
      return;
    }
    try {
      setStatus('picking');
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/octet-stream', 'text/csv', 'text/plain', 'application/pdf', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.length) {
        setStatus('idle');
        return;
      }
      const file = res.assets[0];
      setFileName(file.name);
      setStatus('uploading');

      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as any);
      formData.append('brokerage', selectedBrokerage);

      const uploadRes = await apiFetch('/api/investments/import', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!uploadRes.ok) {
        const msg = await uploadRes.text().catch(() => `Erro ${uploadRes.status}`);
        throw new Error(msg || `Erro ${uploadRes.status}`);
      }
      const data: ImportResult = await uploadRes.json().catch(() => ({}));
      setResult(data);
      setStatus('success');
    } catch (e: any) {
      setResult({ message: e?.message ?? 'Falha ao importar arquivo.' });
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setFileName(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1420'] : ['#EBF8FF', '#F5F7FA']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={[s.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Importar Corretora</Text>
        <Text style={[s.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Importe notas de corretagem e extratos de investimentos
        </Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
      >
        {status === 'success' ? (
          <View style={[s.resultCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
            <Feather name="check-circle" size={40} color={colors.primary} />
            <Text style={[s.resultTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Importação concluída!</Text>
            {result?.imported != null && (
              <Text style={[s.resultText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                {result.imported} transações importadas
                {result.skipped ? ` · ${result.skipped} ignoradas (duplicatas)` : ''}
              </Text>
            )}
            {result?.message && (
              <Text style={[s.resultText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{result.message}</Text>
            )}
            <Pressable onPress={handleReset} style={[s.resetBtn, { backgroundColor: colors.primary }]}>
              <Text style={[{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 }]}>Importar outro arquivo</Text>
            </Pressable>
          </View>
        ) : status === 'error' ? (
          <View style={[s.resultCard, { backgroundColor: `${colors.danger}12`, borderColor: `${colors.danger}30` }]}>
            <Feather name="x-circle" size={40} color={colors.danger} />
            <Text style={[s.resultTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Falha na importação</Text>
            {result?.message && (
              <Text style={[s.resultText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{result.message}</Text>
            )}
            <Pressable onPress={handleReset} style={[s.resetBtn, { backgroundColor: colors.danger }]}>
              <Text style={[{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 }]}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[s.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                1. Selecione a instituição
              </Text>
              {BROKERAGES.map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => setSelectedBrokerage(b.id)}
                  style={[s.brokerRow, {
                    borderColor: selectedBrokerage === b.id ? b.color : theme.border,
                    backgroundColor: selectedBrokerage === b.id ? `${b.color}10` : 'transparent',
                  }]}
                >
                  <View style={[s.brokerIcon, { backgroundColor: `${b.color}20` }]}>
                    <Feather name={b.icon as any} size={18} color={b.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.brokerLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{b.label}</Text>
                    <Text style={[s.brokerFormat, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{b.format}</Text>
                  </View>
                  <View style={[s.radio, { borderColor: selectedBrokerage === b.id ? b.color : theme.border }]}>
                    {selectedBrokerage === b.id && (
                      <View style={[s.radioDot, { backgroundColor: b.color }]} />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[s.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                2. Selecione o arquivo
              </Text>
              {fileName && (
                <View style={[s.fileRow, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                  <Feather name="file" size={16} color={colors.primary} />
                  <Text style={[s.fileName, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
                    {fileName}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={handlePick}
                disabled={status === 'uploading' || status === 'picking'}
                style={({ pressed }) => [s.uploadBtn, {
                  borderColor: colors.primary,
                  backgroundColor: selectedBrokerage ? `${colors.primary}10` : theme.surfaceElevated,
                  opacity: pressed ? 0.8 : 1,
                }]}
              >
                {status === 'uploading' ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Feather name="upload" size={22} color={colors.primary} />
                    <Text style={[s.uploadText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                      {fileName ? 'Trocar arquivo' : 'Escolher arquivo'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={[s.infoCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
              <Feather name="shield" size={15} color={colors.primary} />
              <Text style={[s.infoText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Seus arquivos são processados com segurança e não são armazenados em nossos servidores após o processamento.
              </Text>
            </View>
          </>
        )}
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
  brokerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  brokerIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  brokerLabel: { fontSize: 14 },
  brokerFormat: { fontSize: 12, marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  fileName: { flex: 1, fontSize: 13 },
  uploadBtn: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed' },
  uploadText: { fontSize: 16 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  resultCard: { borderRadius: 16, padding: 24, gap: 12, borderWidth: 1, alignItems: 'center' },
  resultTitle: { fontSize: 20 },
  resultText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  resetBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
});
