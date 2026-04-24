import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput, Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Money } from '@/components/Money';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import {
  downloadIrpfRaw, downloadIrpfGuidePdf, runOptimizer, getIrpfGuide,
  type IrpfGuide, type OptimizerSuggestion,
} from '@/services/tax';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

export default function IrpfExportScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [year, setYear] = useState<number>(CURRENT_YEAR - 1);

  const [downloading, setDownloading] = useState(false);
  const [downloadingGuide, setDownloadingGuide] = useState(false);
  const [guide, setGuide] = useState<IrpfGuide | null>(null);
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Otimizador
  const [plannedSale, setPlannedSale] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [suggestions, setSuggestions] = useState<OptimizerSuggestion[] | null>(null);

  const handleDownloadDec = useCallback(async () => {
    setError(null);
    setDownloading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await downloadIrpfRaw(year);
      if (!res.ok) {
        throw new Error(`Servidor respondeu ${res.status}`);
      }
      const blob = await res.blob();
      const base64 = await blobToBase64(blob);
      const fileUri = `${FileSystem.cacheDirectory}irpf-${year}.DEC`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/octet-stream',
          dialogTitle: 'Compartilhar arquivo IRPF',
          UTI: 'public.data',
        });
      } else {
        Alert.alert(
          'Arquivo gerado',
          `Arquivo salvo em ${fileUri}. Envie para o computador para importar no programa da Receita.`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao baixar o arquivo IRPF.');
    } finally {
      setDownloading(false);
    }
  }, [year]);

  const handleDownloadGuide = useCallback(async () => {
    setError(null);
    setDownloadingGuide(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await downloadIrpfGuidePdf(year);
      if (!res.ok) throw new Error(`Servidor respondeu ${res.status}`);
      const blob = await res.blob();
      const base64 = await blobToBase64(blob);
      const fileUri = `${FileSystem.cacheDirectory}guia-irpf-${year}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Guia IRPF',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao baixar o guia IRPF.');
    } finally {
      setDownloadingGuide(false);
    }
  }, [year]);

  const handleLoadGuide = useCallback(async () => {
    setError(null);
    setLoadingGuide(true);
    try {
      const g = await getIrpfGuide(year);
      setGuide(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar o guia.');
      setGuide(null);
    } finally {
      setLoadingGuide(false);
    }
  }, [year]);

  const handleOptimize = useCallback(async () => {
    setError(null);
    setOptimizing(true);
    setSuggestions(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const sale = Number(plannedSale.replace(',', '.')) || 0;
      const res = await runOptimizer({ year, plannedSale: sale });
      setSuggestions(res.suggestions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao executar o otimizador.');
    } finally {
      setOptimizing(false);
    }
  }, [year, plannedSale]);

  return (
    <>
      <Stack.Screen options={{ title: 'Exportar IRPF' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Seletor de ano */}
        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
            Ano-base
          </Text>
          <View style={styles.yearRow}>
            {YEAR_OPTIONS.map((y) => (
              <PressableScale
                key={y}
                onPress={() => setYear(y)}
                haptic="light"
                style={[
                  styles.yearChip,
                  { borderColor: theme.border, backgroundColor: year === y ? colors.primary : theme.card },
                ]}
                testID={`select-year-${y}`}
              >
                <Text style={{
                  color: year === y ? '#fff' : theme.text,
                  fontFamily: 'Inter_600SemiBold', fontSize: 14,
                }}>
                  {y}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>

        {/* Card baixar .DEC */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15` }]}>
            <Icon name="download" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Arquivo importável (.DEC)
            </Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Importe direto no programa da Receita Federal sem digitar nada.
            </Text>
            <PressableScale
              onPress={handleDownloadDec}
              haptic="medium"
              disabled={downloading}
              style={[styles.btn, { backgroundColor: colors.primary }]}
              testID="download-dec"
            >
              {downloading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Baixar arquivo</Text>}
            </PressableScale>
          </View>
        </View>

        {/* Card guia passo-a-passo */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.info}15` }]}>
            <Icon name="file-text" size={22} color={colors.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Guia passo-a-passo
            </Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Veja exatamente o que preencher em cada ficha.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <PressableScale
                onPress={handleLoadGuide}
                haptic="light"
                style={[styles.btn, styles.btnGhost, { borderColor: colors.info, flex: 1 }]}
                disabled={loadingGuide}
                testID="load-guide"
              >
                {loadingGuide
                  ? <ActivityIndicator color={colors.info} />
                  : <Text style={[styles.btnGhostText, { color: colors.info }]}>Ver passos</Text>}
              </PressableScale>
              <PressableScale
                onPress={handleDownloadGuide}
                haptic="medium"
                style={[styles.btn, { backgroundColor: colors.info, flex: 1 }]}
                disabled={downloadingGuide}
                testID="download-guide"
              >
                {downloadingGuide
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>PDF</Text>}
              </PressableScale>
            </View>
          </View>
        </View>

        {guide && guide.steps?.length > 0 && (
          <View style={[styles.guideBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.guideTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Roteiro {guide.year}
            </Text>
            {guide.steps.map((s) => (
              <View key={s.step} style={[styles.guideStep, { borderColor: theme.border }]}>
                <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumText}>{s.step}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                    {s.title}
                  </Text>
                  <Text style={[styles.stepDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    {s.description}
                  </Text>
                  {s.fields?.map((f, i) => (
                    <View key={i} style={styles.fieldRow}>
                      <Text style={[styles.fieldLabel, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>
                        {f.label}
                      </Text>
                      <Text style={[styles.fieldVal, { color: theme.text, fontFamily: 'RobotoMono_500Medium' }]}>
                        {f.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Otimizador */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.success}15` }]}>
            <Icon name="trending-up" size={22} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Otimizador IR
            </Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Informe um ganho previsto e veja sugestões de movimentos para reduzir IR.
            </Text>
            <View style={[styles.input, { borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}>
              <Text style={{ color: theme.textTertiary, fontFamily: 'RobotoMono_500Medium' }}>R$</Text>
              <TextInput
                value={plannedSale}
                onChangeText={setPlannedSale}
                placeholder="0,00"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                style={{
                  flex: 1, color: theme.text,
                  fontFamily: 'RobotoMono_500Medium', fontSize: 16,
                }}
                testID="planned-sale-input"
              />
            </View>
            <PressableScale
              onPress={handleOptimize}
              haptic="medium"
              disabled={optimizing}
              style={[styles.btn, { backgroundColor: colors.success, marginTop: 12 }]}
              testID="run-optimizer"
            >
              {optimizing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Calcular sugestões</Text>}
            </PressableScale>
          </View>
        </View>

        {suggestions && suggestions.length > 0 && (
          <View style={{ gap: 8 }}>
            {suggestions.map((s, i) => (
              <View key={i} style={[styles.suggestion, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.suggTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                    {s.title}
                  </Text>
                  <Text style={[styles.suggDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    {s.description}
                  </Text>
                </View>
                {s.estimatedSaving !== undefined && (
                  <Money value={s.estimatedSaving} size="md" weight="700" color={colors.success} signed />
                )}
              </View>
            ))}
          </View>
        )}

        {error && (
          <Text style={[styles.errorText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
            {error}
          </Text>
        )}
      </ScrollView>
    </>
  );
}

// --------- Helpers ---------

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') return reject(new Error('Falha ao ler arquivo.'));
      // result = "data:<mime>;base64,XXX" — extrair só o XXX
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Erro de leitura'));
    reader.readAsDataURL(blob);
  });
}

const styles = StyleSheet.create({
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  yearRow: { flexDirection: 'row', gap: 8 },
  yearChip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1 },

  card: {
    flexDirection: 'row', gap: 12,
    padding: 16, borderRadius: 12, borderWidth: 1,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16 },
  cardDesc: { fontSize: 13, marginTop: 4 },
  btn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1 },
  btnGhostText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },

  input: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 10, borderWidth: 1, marginTop: 12,
  },

  guideBox: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  guideTitle: { fontSize: 16 },
  guideStep: { flexDirection: 'row', gap: 10, paddingTop: 10, borderTopWidth: 1 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 12 },
  stepTitle: { fontSize: 14 },
  stepDesc: { fontSize: 12, marginTop: 2 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  fieldLabel: { fontSize: 12 },
  fieldVal: { fontSize: 12 },

  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  suggTitle: { fontSize: 14 },
  suggDesc: { fontSize: 12, marginTop: 2 },

  errorText: { textAlign: 'center', marginTop: 8 },
});
