import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import {
  CategorizationRule, RuleMatchType,
  listRules, createRule, updateRule, deleteRule, testRule,
} from '@/services/categorizationRules';

const MATCH_LABELS: Record<RuleMatchType, string> = {
  contains: 'Contém',
  starts: 'Começa com',
  equals: 'É igual a',
  regex: 'Regex',
};

const MATCH_ORDER: RuleMatchType[] = ['contains', 'starts', 'equals', 'regex'];

interface RuleFormState {
  pattern: string;
  matchType: RuleMatchType;
  category: string;
  active: boolean;
}

const EMPTY_FORM: RuleFormState = {
  pattern: '',
  matchType: 'contains',
  category: '',
  active: true,
};

export default function CategorizationRulesScreen() {
  const { theme, colors } = useTheme();
  const qc = useQueryClient();

  const [editing, setEditing] = useState<CategorizationRule | null>(null);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [testText, setTestText] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { matched: boolean; ruleId?: string; category?: string }>(null);

  const { data, isLoading, refetch } = useQuery<CategorizationRule[]>({
    queryKey: ['/api/categorization-rules'],
    queryFn: listRules,
    staleTime: 30_000,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        pattern: form.pattern.trim(),
        matchType: form.matchType,
        category: form.category.trim() || undefined,
        active: form.active,
      };
      if (editing?.id) return updateRule(editing.id, payload);
      return createRule(payload);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['/api/categorization-rules'] });
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    },
    onError: (e) => Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['/api/categorization-rules'] });
    },
    onError: (e) => Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível excluir.'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (r: CategorizationRule) => {
    setEditing(r);
    setForm({
      pattern: r.pattern,
      matchType: r.matchType,
      category: r.category || r.categoryId || '',
      active: r.active !== false,
    });
    setModalOpen(true);
  };

  const handleDelete = (r: CategorizationRule) => {
    Alert.alert(
      'Excluir regra?',
      `Excluir a regra "${r.pattern}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteMut.mutate(r.id) },
      ],
    );
  };

  const runTest = async () => {
    if (!testText.trim()) {
      setTestResult(null);
      return;
    }
    setTesting(true);
    try {
      const r = await testRule(testText);
      setTestResult({
        matched: r.matched,
        ruleId: r.rule?.id,
        category: r.rule?.category || r.rule?.categoryId,
      });
      Haptics.selectionAsync();
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao testar.');
    } finally {
      setTesting(false);
    }
  };

  const renderItem = ({ item }: { item: CategorizationRule }) => (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, opacity: item.active === false ? 0.55 : 1 }]}
      testID={`rule-${item.id}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rulePattern, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          {item.pattern}
        </Text>
        <Text style={[styles.ruleMeta, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          {MATCH_LABELS[item.matchType]} → {item.category || item.categoryId || '—'}
        </Text>
      </View>
      <Pressable onPress={() => openEdit(item)} hitSlop={8} style={styles.iconBtn} testID={`edit-${item.id}`}>
        <Feather name="edit-2" size={16} color={colors.primary} />
      </Pressable>
      <Pressable onPress={() => handleDelete(item)} hitSlop={8} style={styles.iconBtn} testID={`del-${item.id}`}>
        <Feather name="trash-2" size={16} color={colors.danger} />
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Regras de categorização' }} />

      {/* Tester */}
      <View style={[styles.tester, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.testerTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Testar regras</Text>
        <View style={styles.testerRow}>
          <TextInput
            value={testText}
            onChangeText={setTestText}
            placeholder="Ex.: Pix Mercado Livre"
            placeholderTextColor={theme.textTertiary}
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular', flex: 1 }]}
            testID="test-input"
          />
          <Pressable
            onPress={runTest}
            disabled={testing}
            style={[styles.testBtn, { backgroundColor: colors.primary, opacity: testing ? 0.7 : 1 }]}
            testID="test-button"
          >
            {testing ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text style={[styles.testBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Testar</Text>
            )}
          </Pressable>
        </View>
        {testResult && (
          <View
            style={[
              styles.testResult,
              {
                backgroundColor: testResult.matched ? `${colors.primary}15` : `${colors.warning}15`,
                borderColor: testResult.matched ? `${colors.primary}40` : `${colors.warning}40`,
              },
            ]}
          >
            <Feather
              name={testResult.matched ? 'check-circle' : 'alert-circle'}
              size={14}
              color={testResult.matched ? colors.primary : colors.warning}
            />
            <Text style={[styles.testResultText, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
              {testResult.matched
                ? `Categorizado como "${testResult.category || '—'}"`
                : 'Nenhuma regra correspondeu.'}
            </Text>
          </View>
        )}
      </View>

      {/* Lista */}
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="filter" size={28} color={theme.textTertiary} />
              <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_500Medium', marginTop: 8 }}>
                Nenhuma regra criada.
              </Text>
            </View>
          }
        />
      )}

      <Pressable
        onPress={openCreate}
        style={[styles.fab, { backgroundColor: colors.primary }]}
        testID="add-rule"
      >
        <Feather name="plus" size={22} color="#fff" />
      </Pressable>

      {/* Form modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={[styles.modalCard, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                {editing ? 'Editar regra' : 'Nova regra'}
              </Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={8}>
                <Feather name="x" size={22} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 12, gap: 14 }}>
              <View>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Padrão</Text>
                <TextInput
                  value={form.pattern}
                  onChangeText={(v) => setForm((p) => ({ ...p, pattern: v }))}
                  placeholder="Ex.: UBER, IFOOD, NETFLIX"
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
                  autoCapitalize="none"
                  testID="form-pattern"
                />
              </View>
              <View>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Tipo de match</Text>
                <View style={styles.matchRow}>
                  {MATCH_ORDER.map((m) => {
                    const active = form.matchType === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => setForm((p) => ({ ...p, matchType: m }))}
                        style={[
                          styles.matchChip,
                          {
                            backgroundColor: active ? colors.primary : theme.surface,
                            borderColor: active ? colors.primary : theme.border,
                          },
                        ]}
                        testID={`match-${m}`}
                      >
                        <Text style={{ color: active ? '#fff' : theme.text, fontFamily: 'Inter_500Medium', fontSize: 13 }}>
                          {MATCH_LABELS[m]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Categoria</Text>
                <TextInput
                  value={form.category}
                  onChangeText={(v) => setForm((p) => ({ ...p, category: v }))}
                  placeholder="Ex.: food, transport"
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
                  autoCapitalize="none"
                  testID="form-category"
                />
              </View>
            </ScrollView>
            <Pressable
              onPress={() => saveMut.mutate()}
              disabled={saveMut.isPending || !form.pattern.trim()}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !form.pattern.trim() || saveMut.isPending ? 0.55 : 1 }]}
              testID="form-save"
            >
              {saveMut.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>
                  {editing ? 'Salvar alterações' : 'Criar regra'}
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tester: { margin: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  testerTitle: { fontSize: 14 },
  testerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  testBtnText: { color: '#fff', fontSize: 14 },
  testResult: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  testResultText: { fontSize: 13, flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  rulePattern: { fontSize: 15 },
  ruleMeta: { fontSize: 12, marginTop: 2 },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  fab: { position: 'absolute', right: 20, bottom: 28, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 28, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 18 },
  label: { fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderRadius: 10, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15 },
  matchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  matchChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
});
