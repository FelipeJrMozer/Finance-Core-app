import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable,
  TextInput, Modal, Alert, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/api';
import { ApiCategory } from '@/context/FinanceContext';

const COLORS_PALETTE = [
  '#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#06B6D4',
  '#84CC16','#F97316','#EC4899','#14B8A6','#6366F1','#F43F5E',
  '#A3E635','#FB923C','#E879F9','#22D3EE','#4ADE80','#FBBF24',
];

const ICONS_PALETTE = [
  'shopping-bag','home','car','coffee','zap','heart','music','book',
  'briefcase','gift','dollar-sign','globe','cpu','film','camera','tool',
  'trending-up','award','activity','umbrella','star','sun','moon','wifi',
];

type TabType = 'expense' | 'income';

interface FormState {
  name: string;
  color: string;
  icon: string;
  type: TabType;
}

const DEFAULT_FORM: FormState = { name: '', color: '#10B981', icon: 'shopping-bag', type: 'expense' };

export default function CategoriesScreen() {
  const { theme, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [tab, setTab] = useState<TabType>('expense');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ApiCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const load = async () => {
    try {
      setLoading(true);
      const data = await apiGet<ApiCategory[]>('/api/categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = categories.filter((c) => c.type === tab);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...DEFAULT_FORM, type: tab });
    setShowModal(true);
  };

  const openEdit = (cat: ApiCategory) => {
    setEditing(cat);
    setForm({ name: cat.name, color: cat.color ?? '#10B981', icon: cat.icon ?? 'shopping-bag', type: cat.type as TabType });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Atenção', 'Informe o nome da categoria.');
      return;
    }
    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (editing) {
        const updated = await apiPatch<ApiCategory>(`/api/categories/${editing.id}`, {
          name: form.name.trim(),
          color: form.color,
          icon: form.icon,
        });
        setCategories((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
      } else {
        const created = await apiPost<ApiCategory>('/api/categories', {
          name: form.name.trim(),
          color: form.color,
          icon: form.icon,
          type: form.type,
        });
        setCategories((prev) => [...prev, created]);
      }
      setShowModal(false);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar a categoria.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: ApiCategory) => {
    Alert.alert(
      'Excluir categoria',
      `Excluir "${cat.name}"? As transações associadas não serão apagadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            try {
              await apiDelete(`/api/categories/${cat.id}`);
              setCategories((prev) => prev.filter((c) => c.id !== cat.id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1420'] : ['#EBF8FF', '#F5F7FA']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[s.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Categorias</Text>
          <Pressable
            onPress={openAdd}
            style={[s.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={[s.addText, { fontFamily: 'Inter_600SemiBold' }]}>Nova</Text>
          </Pressable>
        </View>
        <View style={[s.tabRow, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          {(['expense', 'income'] as TabType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[s.tabBtn, { backgroundColor: tab === t ? colors.primary : 'transparent' }]}
            >
              <Text style={[s.tabText, { color: tab === t ? '#fff' : theme.textSecondary, fontFamily: tab === t ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {t === 'expense' ? 'Despesas' : 'Receitas'}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 32 }}
        >
          {filtered.length === 0 ? (
            <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
              <Feather name="tag" size={40} color={theme.textTertiary} />
              <Text style={[{ color: theme.textSecondary, fontSize: 16, fontFamily: 'Inter_500Medium' }]}>
                Nenhuma categoria de {tab === 'expense' ? 'despesa' : 'receita'}
              </Text>
              <Pressable onPress={openAdd} style={[s.emptyBtn, { backgroundColor: colors.primary }]}>
                <Text style={[{ color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' }]}>Criar categoria</Text>
              </Pressable>
            </View>
          ) : (
            filtered.map((cat) => (
              <View key={cat.id} style={[s.catRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[s.catIcon, { backgroundColor: `${cat.color ?? colors.primary}20` }]}>
                  <Feather name={(cat.icon as any) ?? 'tag'} size={18} color={cat.color ?? colors.primary} />
                </View>
                <Text style={[s.catName, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
                  {cat.name}
                </Text>
                <View style={[s.colorDot, { backgroundColor: cat.color ?? colors.primary }]} />
                <Pressable onPress={() => openEdit(cat)} hitSlop={8}>
                  <Feather name="edit-2" size={16} color={theme.textTertiary} />
                </Pressable>
                <Pressable onPress={() => handleDelete(cat)} hitSlop={8}>
                  <Feather name="trash-2" size={16} color={colors.danger} />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={[s.modalCard, { backgroundColor: theme.surface }]} onPress={() => {}}>
            <Text style={[s.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              {editing ? 'Editar categoria' : 'Nova categoria'}
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={[s.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Nome</Text>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Ex: Mercado, Salário..."
                placeholderTextColor={theme.textTertiary}
                style={[s.input, { color: theme.text, backgroundColor: theme.surfaceElevated, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
              />
            </View>

            {!editing && (
              <View style={{ gap: 6 }}>
                <Text style={[s.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Tipo</Text>
                <View style={[s.tabRow, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                  {(['expense', 'income'] as TabType[]).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setForm((f) => ({ ...f, type: t }))}
                      style={[s.tabBtn, { backgroundColor: form.type === t ? colors.primary : 'transparent' }]}
                    >
                      <Text style={[s.tabText, { color: form.type === t ? '#fff' : theme.textSecondary, fontFamily: form.type === t ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                        {t === 'expense' ? 'Despesa' : 'Receita'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={{ gap: 6 }}>
              <Text style={[s.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cor</Text>
              <View style={s.colorGrid}>
                {COLORS_PALETTE.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setForm((f) => ({ ...f, color: c }))}
                    style={[s.colorSwatch, { backgroundColor: c, borderWidth: form.color === c ? 3 : 0, borderColor: '#fff' }]}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[s.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Ícone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.iconGrid}>
                  {ICONS_PALETTE.map((ic) => (
                    <Pressable
                      key={ic}
                      onPress={() => setForm((f) => ({ ...f, icon: ic }))}
                      style={[s.iconBtn, {
                        backgroundColor: form.icon === ic ? `${form.color}30` : theme.surfaceElevated,
                        borderColor: form.icon === ic ? form.color : theme.border,
                      }]}
                    >
                      <Feather name={ic as any} size={18} color={form.icon === ic ? form.color : theme.textTertiary} />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => setShowModal(false)}
                style={[s.cancelBtn, { borderColor: theme.border }]}
              >
                <Text style={[{ color: theme.textSecondary, fontFamily: 'Inter_500Medium', fontSize: 15 }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={[{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 }]}>Salvar</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  title: { fontSize: 26 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addText: { color: '#fff', fontSize: 14 },
  tabRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 3, gap: 4 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8 },
  tabText: { fontSize: 13 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  catIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  catName: { flex: 1, fontSize: 14 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  modalTitle: { fontSize: 20 },
  fieldLabel: { fontSize: 13 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorSwatch: { width: 32, height: 32, borderRadius: 8 },
  iconGrid: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 42, height: 42, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  saveBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
});
