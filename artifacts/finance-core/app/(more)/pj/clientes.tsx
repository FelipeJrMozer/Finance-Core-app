import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { formatBRL } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';

interface PJClient {
  id: string;
  name: string;
  document: string;
  email?: string;
  phone?: string;
  totalBilled: number;
  lastTransaction?: string;
}

const STORAGE_KEY = 'pf_pj_clients';

export default function PJClientesScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [clients, setClients] = useState<PJClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) setClients(JSON.parse(data));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadClients(); }, [loadClients]);

  const saveClient = async () => {
    if (!name.trim()) { Alert.alert('Atenção', 'Nome é obrigatório'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newClient: PJClient = {
      id: Date.now().toString(),
      name: name.trim(),
      document: document.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      totalBilled: 0,
    };
    const updated = [...clients, newClient];
    setClients(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setName(''); setDocument(''); setEmail(''); setPhone('');
    setShowForm(false);
  };

  const deleteClient = (id: string) => {
    Alert.alert('Remover cliente?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const updated = clients.filter((c) => c.id !== id);
          setClients(updated);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      }
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
    >
      <Pressable
        onPress={() => { Haptics.selectionAsync(); setShowForm(!showForm); }}
        style={[styles.addBtn, { backgroundColor: colors.primary }]}
      >
        <Feather name={showForm ? 'x' : 'user-plus'} size={18} color="#fff" />
        <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
          {showForm ? 'Cancelar' : 'Novo Cliente'}
        </Text>
      </Pressable>

      {showForm && (
        <View style={[styles.form, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {[
            { label: 'Nome *', value: name, set: setName, placeholder: 'Nome da empresa ou pessoa' },
            { label: 'CNPJ / CPF', value: document, set: setDocument, placeholder: '00.000.000/0001-00' },
            { label: 'Email', value: email, set: setEmail, placeholder: 'contato@empresa.com' },
            { label: 'Telefone', value: phone, set: setPhone, placeholder: '(11) 99999-9999' },
          ].map((f) => (
            <View key={f.label} style={{ gap: 4 }}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>{f.label}</Text>
              <TextInput
                value={f.value}
                onChangeText={f.set}
                placeholder={f.placeholder}
                placeholderTextColor={theme.textTertiary}
                style={[styles.fieldInput, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.text, fontFamily: 'Inter_400Regular' }]}
              />
            </View>
          ))}
          <Pressable onPress={saveClient} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Salvar Cliente</Text>
          </Pressable>
        </View>
      )}

      {loading && <ActivityIndicator color={colors.primary} />}

      {!loading && clients.length === 0 && (
        <EmptyState
          icon="users"
          title="Nenhum cliente cadastrado"
          description="Adicione seus clientes para controlar o faturamento por cliente"
        />
      )}

      {clients.map((c) => (
        <View key={c.id} style={[styles.clientCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.clientAvatar, { backgroundColor: `${colors.primary}20` }]}>
            <Text style={[styles.clientInitial, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
              {c.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.clientName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{c.name}</Text>
            {c.document ? (
              <Text style={[styles.clientDoc, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{c.document}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={[styles.clientBilled, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
              {formatBRL(c.totalBilled)}
            </Text>
            <Pressable onPress={() => deleteClient(c.id)} hitSlop={8}>
              <Feather name="trash-2" size={16} color={colors.danger} />
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  addBtnText: { fontSize: 16, color: '#fff' },
  form: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  fieldLabel: { fontSize: 13 },
  fieldInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
  saveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 15, color: '#fff' },
  clientCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  clientAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  clientInitial: { fontSize: 18 },
  clientName: { fontSize: 15 },
  clientDoc: { fontSize: 12, marginTop: 2 },
  clientBilled: { fontSize: 14 },
});
