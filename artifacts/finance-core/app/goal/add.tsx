import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const ICONS = ['target', 'home', 'car', 'briefcase', 'heart', 'star', 'sun', 'globe'] as const;
const COLORS = ['#00C853', '#2196F3', '#9C27B0', '#FF9800', '#E91E63', '#009688', '#FF6B35', '#795548'];

export default function AddGoalScreen() {
  const { theme, colors } = useTheme();
  const { addGoal } = useFinance();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('2027-12-31');
  const [icon, setIcon] = useState<typeof ICONS[number]>('target');
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    if (!name.trim() || !target) return;
    const targetNum = parseFloat(target.replace(',', '.'));
    if (isNaN(targetNum) || targetNum <= 0) return;
    setLoading(true);
    addGoal({ name: name.trim(), targetAmount: targetNum, currentAmount: 0, deadline, icon, color });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Nova Meta</Text>

        <Input label="Nome da meta" value={name} onChangeText={setName} placeholder="Ex: Casa própria" icon="target" testID="name-input" />
        <Input label="Valor alvo (R$)" value={target} onChangeText={setTarget} placeholder="0,00" keyboardType="decimal-pad" icon="dollar-sign" />
        <Input label="Prazo (AAAA-MM-DD)" value={deadline} onChangeText={setDeadline} placeholder="2027-12-31" icon="calendar" />

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Ícone</Text>
          <View style={styles.row}>
            {ICONS.map((ic) => (
              <Pressable
                key={ic}
                onPress={() => { setIcon(ic); Haptics.selectionAsync(); }}
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: icon === ic ? `${color}25` : theme.surfaceElevated,
                    borderColor: icon === ic ? color : theme.border,
                  }
                ]}
              >
                <Feather name={ic} size={20} color={icon === ic ? color : theme.textTertiary} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cor</Text>
          <View style={styles.row}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => { setColor(c); Haptics.selectionAsync(); }}
                style={[styles.colorDot, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: '#fff' }]}
              >
                {color === c && <Feather name="check" size={14} color="#fff" />}
              </Pressable>
            ))}
          </View>
        </View>

        <Button testID="save-goal" label="Salvar Meta" onPress={handleSave} loading={loading} fullWidth size="lg" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  title: { fontSize: 22 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
