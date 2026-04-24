import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const TYPES = [
  { value: 'stocks', label: 'Ações BR', color: '#2196F3' },
  { value: 'fii', label: 'FIIs', color: '#9C27B0' },
  { value: 'reit', label: 'REITs', color: '#FF9800' },
  { value: 'fixed', label: 'Renda Fixa', color: '#4CAF50' },
  { value: 'crypto', label: 'Cripto', color: '#FF6B35' },
  { value: 'etf', label: 'ETFs', color: '#00BCD4' },
] as const;

export default function AddInvestmentScreen() {
  const { theme, colors } = useTheme();
  const { addInvestment } = useFinance();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ ticker?: string; name?: string; type?: string; price?: string }>();
  const initialType = (typeof params.type === 'string' && ['stocks', 'fii', 'reit', 'fixed', 'crypto', 'etf'].includes(params.type)
    ? params.type : 'stocks') as 'stocks' | 'fii' | 'reit' | 'fixed' | 'crypto' | 'etf';

  const [type, setType] = useState<'stocks' | 'fii' | 'reit' | 'fixed' | 'crypto' | 'etf'>(initialType);
  const [name, setName] = useState(typeof params.name === 'string' ? params.name : '');
  const [ticker, setTicker] = useState(typeof params.ticker === 'string' ? params.ticker.toUpperCase() : '');
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState(typeof params.price === 'string' ? params.price : '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !ticker.trim()) {
      Alert.alert('Atenção', 'Preencha nome e ticker');
      return;
    }
    const qty = parseFloat(quantity.replace(',', '.'));
    const avg = parseFloat(avgPrice.replace(',', '.'));
    const curr = parseFloat(currentPrice.replace(',', '.'));
    if (isNaN(qty) || isNaN(avg) || isNaN(curr)) {
      Alert.alert('Atenção', 'Valores inválidos');
      return;
    }
    setLoading(true);
    try {
      await addInvestment({ name, ticker: ticker.toUpperCase(), type, quantity: qty, avgPrice: avg, currentPrice: curr, currency: 'BRL' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Novo Ativo</Text>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Tipo</Text>
          <View style={styles.typeGrid}>
            {TYPES.map((t) => (
              <Pressable
                key={t.value}
                onPress={() => { setType(t.value); Haptics.selectionAsync(); }}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: type === t.value ? `${t.color}25` : theme.surfaceElevated,
                    borderColor: type === t.value ? t.color : theme.border,
                  }
                ]}
              >
                <Text style={[styles.typeText, { color: type === t.value ? t.color : theme.textSecondary, fontFamily: type === t.value ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Input label="Nome" value={name} onChangeText={setName} placeholder="Ex: Petrobras PN" icon="briefcase" testID="name-input" />
        <Input label="Ticker/Código" value={ticker} onChangeText={(t) => setTicker(t.toUpperCase())} placeholder="Ex: PETR4" icon="hash" testID="ticker-input" />
        <Input label="Quantidade" value={quantity} onChangeText={setQuantity} placeholder="0" keyboardType="decimal-pad" icon="layers" />
        <Input label="Preço médio (R$)" value={avgPrice} onChangeText={setAvgPrice} placeholder="0,00" keyboardType="decimal-pad" icon="dollar-sign" />
        <Input label="Preço atual (R$)" value={currentPrice} onChangeText={setCurrentPrice} placeholder="0,00" keyboardType="decimal-pad" icon="trending-up" />

        <Button testID="save-investment" label="Salvar Ativo" onPress={handleSave} loading={loading} fullWidth size="lg" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  title: { fontSize: 22 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  typeText: { fontSize: 13 },
});
