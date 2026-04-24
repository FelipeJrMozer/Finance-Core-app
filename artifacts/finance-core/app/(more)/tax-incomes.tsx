import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Money } from '@/components/Money';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import {
  listTaxIncomes, createTaxIncome, updateTaxIncome, deleteTaxIncome,
  type TaxIncome,
} from '@/services/tax';

const INCOME_TYPES = [
  { id: 'salario',    label: 'Salário (CLT)' },
  { id: '13o',        label: '13º salário' },
  { id: 'aluguel',    label: 'Aluguel recebido' },
  { id: 'autonomo',   label: 'Autônomo (carnê-leão)' },
  { id: 'pensao',     label: 'Pensão' },
  { id: 'aposenta',   label: 'Aposentadoria' },
  { id: 'isento',     label: 'Rendimento isento' },
  { id: 'dividendos', label: 'Dividendos isentos' },
  { id: 'jcp',        label: 'JCP (tributado na fonte)' },
  { id: 'outro',      label: 'Outro' },
];

export default function TaxIncomesScreen() {
  return (
    <CrudScreen
      title="Rendimentos"
      typeOptions={INCOME_TYPES}
      list={listTaxIncomes}
      create={createTaxIncome as any}
      update={updateTaxIncome as any}
      remove={deleteTaxIncome}
      partyLabel="Fonte pagadora"
      docLabel="CPF/CNPJ da fonte"
      mapDoc={(item) => ({ doc: item.payerDoc, name: item.payerName })}
      buildItem={(common, party) => ({
        ...common,
        payerDoc: party.doc,
        payerName: party.name,
      })}
      testIDPrefix="income"
    />
  );
}

// ----------------------------------------------------------------------
// CrudScreen — também usado por tax-deductions.tsx (re-exportado).
// ----------------------------------------------------------------------

interface CrudScreenProps<T extends { id: string; year: number; type: string; description: string; amount: number }> {
  title: string;
  typeOptions: Array<{ id: string; label: string }>;
  list: (year?: number) => Promise<T[]>;
  create: (payload: Omit<T, 'id'>) => Promise<T>;
  update: (id: string, payload: Partial<Omit<T, 'id'>>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  partyLabel: string;
  docLabel: string;
  mapDoc: (item: T) => { doc?: string; name?: string };
  buildItem: (
    common: { year: number; type: string; description: string; amount: number },
    party: { doc?: string; name?: string },
  ) => Omit<T, 'id'>;
  testIDPrefix: string;
}

export function CrudScreen<T extends { id: string; year: number; type: string; description: string; amount: number }>({
  title, typeOptions, list, create, update, remove,
  partyLabel, docLabel, mapDoc, buildItem, testIDPrefix,
}: CrudScreenProps<T>) {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const currentYear = new Date().getFullYear();
  const YEARS = [currentYear, currentYear - 1, currentYear - 2];

  const [year, setYear] = useState(currentYear);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const total = useMemo(() => items.reduce((s, i) => s + (Number(i.amount) || 0), 0), [items]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list_ = await list(year);
      setItems(Array.isArray(list_) ? list_ : []);
    } catch {
      setError(`Não foi possível carregar ${title.toLowerCase()}.`);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year, title, list]);

  useEffect(() => { load(); }, [load]);

  const handleSave = useCallback(async (
    common: { year: number; type: string; description: string; amount: number },
    party: { doc?: string; name?: string },
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (editing) {
        const updated = await update(editing.id, buildItem(common, party) as Partial<Omit<T, 'id'>>);
        setItems((prev) => prev.map((i) => (i.id === editing.id ? { ...i, ...updated } : i)));
      } else {
        const created = await create(buildItem(common, party));
        setItems((prev) => [created, ...prev]);
      }
      setModalOpen(false);
      setEditing(null);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    }
  }, [editing, create, update, buildItem]);

  const handleDelete = useCallback((item: T) => {
    Alert.alert(
      'Remover',
      `Deseja remover "${item.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover', style: 'destructive',
          onPress: async () => {
            const optimistic = items.filter((i) => i.id !== item.id);
            setItems(optimistic);
            try {
              await remove(item.id);
            } catch {
              setItems(items);
              Alert.alert('Erro', 'Falha ao remover. Tente novamente.');
            }
          },
        },
      ],
    );
  }, [items, remove]);

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={styles.yearRow}>
          {YEARS.map((y) => (
            <PressableScale
              key={y}
              onPress={() => setYear(y)}
              haptic="light"
              style={[
                styles.yearChip,
                { borderColor: theme.border, backgroundColor: year === y ? colors.primary : theme.card },
              ]}
              testID={`${testIDPrefix}-year-${y}`}
            >
              <Text style={{
                color: year === y ? '#fff' : theme.text,
                fontFamily: 'Inter_600SemiBold',
                fontSize: 13,
              }}>
                {y}
              </Text>
            </PressableScale>
          ))}
        </View>

        <View style={[styles.totalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.totalLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            Total {year}
          </Text>
          <Money value={total} size="xl" weight="700" />
          <Text style={[styles.totalSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            {items.length} item(s)
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="file-text"
            title={`Sem ${title.toLowerCase()} em ${year}`}
            description={error ?? 'Adicione itens para acompanhar a sua declaração.'}
            action={{ label: `Adicionar ${title.toLowerCase()}`, onPress: () => { setEditing(null); setModalOpen(true); } }}
          />
        ) : (
          items.map((item) => {
            const typeLabel = typeOptions.find((t) => t.id === item.type)?.label ?? item.type;
            const party = mapDoc(item);
            return (
              <PressableElevate
                key={item.id}
                onPress={() => { setEditing(item); setModalOpen(true); }}
                haptic="light"
                onLongPress={() => handleDelete(item)}
                style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
                testID={`${testIDPrefix}-row-${item.id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.rowSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                    {typeLabel}{party.name ? ` • ${party.name}` : ''}
                  </Text>
                </View>
                <Money value={item.amount} size="md" weight="700" />
              </PressableElevate>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <PressableScale
        onPress={() => { setEditing(null); setModalOpen(true); }}
        haptic="medium"
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 16 }]}
        testID={`add-${testIDPrefix}`}
      >
        <Icon name="plus" size={22} color="#fff" />
      </PressableScale>

      <FormModal
        visible={modalOpen}
        title={editing ? 'Editar' : 'Adicionar'}
        defaults={editing
          ? {
              year: editing.year,
              type: editing.type,
              description: editing.description,
              amount: String(editing.amount),
              doc: mapDoc(editing).doc ?? '',
              name: mapDoc(editing).name ?? '',
            }
          : { year, type: typeOptions[0].id, description: '', amount: '', doc: '', name: '' }
        }
        typeOptions={typeOptions}
        years={YEARS}
        partyLabel={partyLabel}
        docLabel={docLabel}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        testIDPrefix={testIDPrefix}
      />
    </>
  );
}

interface FormDefaults {
  year: number;
  type: string;
  description: string;
  amount: string;
  doc: string;
  name: string;
}

function FormModal({
  visible, title, defaults, typeOptions, years,
  partyLabel, docLabel, onCancel, onSave, testIDPrefix,
}: {
  visible: boolean;
  title: string;
  defaults: FormDefaults;
  typeOptions: Array<{ id: string; label: string }>;
  years: number[];
  partyLabel: string;
  docLabel: string;
  onCancel: () => void;
  onSave: (
    common: { year: number; type: string; description: string; amount: number },
    party: { doc?: string; name?: string },
  ) => Promise<void> | void;
  testIDPrefix: string;
}) {
  const { theme, colors } = useTheme();
  const [year, setYear] = useState(defaults.year);
  const [type, setType] = useState(defaults.type);
  const [description, setDescription] = useState(defaults.description);
  const [amount, setAmount] = useState(defaults.amount);
  const [doc, setDoc] = useState(defaults.doc);
  const [name, setName] = useState(defaults.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setYear(defaults.year);
      setType(defaults.type);
      setDescription(defaults.description);
      setAmount(defaults.amount);
      setDoc(defaults.doc);
      setName(defaults.name);
    }
  }, [visible, defaults]);

  const valid = description.trim().length > 0 && Number(amount.replace(',', '.')) > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              {title}
            </Text>
            <PressableScale onPress={onCancel} haptic="light" style={styles.iconBtn}>
              <Icon name="close" size={20} color={theme.text} />
            </PressableScale>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
            {/* Ano */}
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                Ano
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                {years.map((y) => (
                  <PressableScale
                    key={y}
                    onPress={() => setYear(y)}
                    haptic="light"
                    style={[
                      styles.yearChip,
                      { borderColor: theme.border, backgroundColor: year === y ? colors.primary : theme.card },
                    ]}
                  >
                    <Text style={{
                      color: year === y ? '#fff' : theme.text,
                      fontFamily: 'Inter_600SemiBold', fontSize: 13,
                    }}>
                      {y}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            </View>

            {/* Tipo */}
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                Tipo
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6 }}>
                {typeOptions.map((t) => (
                  <PressableScale
                    key={t.id}
                    onPress={() => setType(t.id)}
                    haptic="light"
                    style={[
                      styles.typeChip,
                      { borderColor: theme.border, backgroundColor: type === t.id ? colors.primary : theme.card },
                    ]}
                  >
                    <Text style={{
                      color: type === t.id ? '#fff' : theme.text,
                      fontFamily: 'Inter_500Medium', fontSize: 12,
                    }}>
                      {t.label}
                    </Text>
                  </PressableScale>
                ))}
              </ScrollView>
            </View>

            <FormField
              label="Descrição"
              value={description} onChangeText={setDescription}
              placeholder="Ex.: Salário Empresa X"
              testID={`${testIDPrefix}-field-description`}
            />
            <FormField
              label="Valor (R$)"
              value={amount} onChangeText={setAmount}
              placeholder="0,00" keyboardType="decimal-pad" mono
              testID={`${testIDPrefix}-field-amount`}
            />
            <FormField
              label={partyLabel}
              value={name} onChangeText={setName}
              placeholder="Nome da empresa/pessoa"
              testID={`${testIDPrefix}-field-name`}
            />
            <FormField
              label={docLabel}
              value={doc} onChangeText={setDoc}
              placeholder="000.000.000-00"
              keyboardType="number-pad" mono
              testID={`${testIDPrefix}-field-doc`}
            />

            <PressableScale
              onPress={async () => {
                if (!valid) return;
                setSaving(true);
                try {
                  await onSave(
                    {
                      year,
                      type,
                      description: description.trim(),
                      amount: Number(amount.replace(',', '.')),
                    },
                    { doc: doc.trim() || undefined, name: name.trim() || undefined },
                  );
                } finally { setSaving(false); }
              }}
              haptic="medium"
              disabled={!valid || saving}
              style={[styles.saveBtn, { backgroundColor: valid ? colors.primary : theme.surfaceElevated }]}
              testID={`${testIDPrefix}-save`}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={[styles.saveText, { color: valid ? '#fff' : theme.textTertiary }]}>
                    Salvar
                  </Text>}
            </PressableScale>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FormField({
  label, value, onChangeText, placeholder, keyboardType, mono, testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'decimal-pad' | 'number-pad' | 'default';
  mono?: boolean;
  testID?: string;
}) {
  const { theme } = useTheme();
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        keyboardType={keyboardType}
        style={[
          styles.input,
          {
            backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.text,
            fontFamily: mono ? 'RobotoMono_500Medium' : 'Inter_400Regular',
          },
        ]}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  yearRow: { flexDirection: 'row', gap: 8 },
  yearChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1 },
  typeChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },

  totalCard: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 4 },
  totalLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalSub: { fontSize: 12 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  rowTitle: { fontSize: 14 },
  rowSub: { fontSize: 12, marginTop: 2 },

  fab: {
    position: 'absolute', right: 16,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18 },
  iconBtn: { padding: 6, borderRadius: 8 },

  fieldLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    marginTop: 6, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 10, borderWidth: 1, fontSize: 15,
  },

  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
});
