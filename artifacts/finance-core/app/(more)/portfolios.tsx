import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  listPortfolios, createPortfolio, updatePortfolio, deletePortfolio, type Portfolio,
} from '@/services/portfolios';

export default function PortfoliosScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Portfolio | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await listPortfolios();
      setItems(list);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar portfólios.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setShowForm(true);
    Haptics.selectionAsync();
  };

  const openEdit = (p: Portfolio) => {
    setEditing(p);
    setName(p.name);
    setDescription(p.description || '');
    setShowForm(true);
    Haptics.selectionAsync();
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Atenção', 'Informe um nome para o portfólio.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const updated = await updatePortfolio(editing.id, { name: trimmed, description: description.trim() || undefined });
        if (!updated) throw new Error('Falha ao atualizar');
        setItems((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      } else {
        const created = await createPortfolio({ name: trimmed, description: description.trim() || undefined });
        if (!created) throw new Error('Falha ao criar');
        setItems((prev) => [...prev, created]);
      }
      setShowForm(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (p: Portfolio) => {
    if (p.isDefault) {
      Alert.alert('Atenção', 'O portfólio padrão não pode ser excluído.');
      return;
    }
    Alert.alert(
      'Excluir portfólio',
      `Deseja excluir "${p.name}"? Os investimentos serão movidos para o portfólio padrão.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const ok = await deletePortfolio(p.id);
            if (ok) {
              setItems((prev) => prev.filter((i) => i.id !== p.id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Alert.alert('Erro', 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Portfólios' }} />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 12 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            {error && (
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name="alert" size={18} color={colors.danger} />
                  <Text style={{ color: theme.text, flex: 1, fontFamily: 'Inter_500Medium' }}>{error}</Text>
                </View>
              </Card>
            )}

            {items.length === 0 && !error ? (
              <EmptyState
                icon="briefcase"
                title="Nenhum portfólio"
                description="Crie portfólios separados para organizar suas estratégias (ex.: Aposentadoria, Especulação)."
                action={{ label: 'Criar portfólio', onPress: openCreate }}
              />
            ) : (
              items.map((p) => (
                <PressableElevate key={p.id} onPress={() => openEdit(p)} testID={`open-portfolio-${p.id}`}>
                  <Card>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}>
                        <Icon name="briefcase" size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{p.name}</Text>
                          {p.isDefault && (
                            <View style={[styles.badge, { backgroundColor: `${colors.primary}20` }]}>
                              <Text style={{ color: colors.primary, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>PADRÃO</Text>
                            </View>
                          )}
                        </View>
                        {p.description ? (
                          <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' }} numberOfLines={2}>
                            {p.description}
                          </Text>
                        ) : null}
                      </View>
                      <PressableScale onPress={() => handleDelete(p)} testID={`delete-portfolio-${p.id}`} hitSlop={10}>
                        <Icon name="delete" size={18} color={theme.textTertiary} />
                      </PressableScale>
                    </View>
                  </Card>
                </PressableElevate>
              ))
            )}
          </ScrollView>
        )}

        <View style={[styles.fab, { bottom: insets.bottom + 16 }]}>
          <PressableScale
            onPress={openCreate}
            testID="add-portfolio"
            haptic="medium"
            style={[styles.fabBtn, { backgroundColor: colors.primary }]}
          >
            <Icon name="plus" size={22} color="#000" />
          </PressableScale>
        </View>

        <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
          <View style={styles.modalBg}>
            <View style={[styles.modal, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'Inter_700Bold' }}>
                  {editing ? 'Editar portfólio' : 'Novo portfólio'}
                </Text>
                <PressableScale onPress={() => setShowForm(false)} hitSlop={10} testID="close-portfolio-form">
                  <Icon name="close" size={22} color={theme.textTertiary} />
                </PressableScale>
              </View>

              <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }}>NOME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ex.: Aposentadoria"
                placeholderTextColor={theme.textTertiary}
                style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
                testID="input-portfolio-name"
                autoFocus
              />

              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 12, fontFamily: 'Inter_500Medium' }}>DESCRIÇÃO (opcional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Estratégia, objetivo, prazo..."
                placeholderTextColor={theme.textTertiary}
                multiline
                style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border, minHeight: 70, textAlignVertical: 'top' }]}
                testID="input-portfolio-description"
              />

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <View style={{ flex: 1 }}>
                  <Button label="Cancelar" variant="secondary" onPress={() => setShowForm(false)} fullWidth />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={editing ? 'Salvar' : 'Criar'} onPress={handleSave} loading={saving} fullWidth testID="save-portfolio" />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  fab: { position: 'absolute', right: 20 },
  fabBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 4 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: 'Inter_400Regular', fontSize: 15, marginTop: 4 },
});
