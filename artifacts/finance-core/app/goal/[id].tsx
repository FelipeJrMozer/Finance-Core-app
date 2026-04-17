import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL, formatDate } from '@/utils/formatters';
import { safeFeatherIcon } from '@/utils/icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, colors } = useTheme();
  const { goals, addContribution } = useFinance();
  const insets = useSafeAreaInsets();
  const [contrib, setContrib] = useState('');

  const goal = goals.find((g) => g.id === id);
  if (!goal) return null;

  const pct = Math.min(goal.currentAmount / goal.targetAmount, 1);
  const daysLeft = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000));
  const remaining = goal.targetAmount - goal.currentAmount;
  const monthlyNeeded = daysLeft > 0 ? remaining / (daysLeft / 30) : 0;

  const handleContribute = () => {
    const amount = parseFloat(contrib.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;
    addContribution(goal.id, amount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setContrib('');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <LinearGradient colors={[goal.color, `${goal.color}99`]} style={styles.hero}>
        <Feather name={safeFeatherIcon(goal.icon, 'target')} size={40} color="#fff" />
        <Text style={[styles.heroName, { fontFamily: 'Inter_700Bold' }]}>{goal.name}</Text>
        <Text style={[styles.heroPct, { fontFamily: 'Inter_700Bold' }]}>{(pct * 100).toFixed(1)}%</Text>
        <View style={[styles.heroBar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
          <View style={[styles.heroBarFill, { width: `${pct * 100}%`, backgroundColor: '#fff' }]} />
        </View>
        <Text style={[styles.heroAmounts, { fontFamily: 'Inter_400Regular' }]}>
          {formatBRL(goal.currentAmount)} de {formatBRL(goal.targetAmount)}
        </Text>
      </LinearGradient>

      <View style={{ padding: 16, gap: 16 }}>
        <View style={styles.statsGrid}>
          {[
            { label: 'Restante', value: formatBRL(remaining), icon: 'target' as const },
            { label: 'Prazo', value: formatDate(goal.deadline), icon: 'calendar' as const },
            { label: 'Dias restantes', value: `${daysLeft}d`, icon: 'clock' as const },
            { label: 'Mensal necessário', value: formatBRL(monthlyNeeded), icon: 'trending-up' as const },
          ].map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name={stat.icon} size={16} color={goal.color} />
              <Text style={[styles.statValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {pct < 1 && (
          <View style={[styles.contributeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.contributeTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Fazer um Aporte
            </Text>
            <Input
              label="Valor (R$)"
              value={contrib}
              onChangeText={setContrib}
              placeholder="0,00"
              keyboardType="decimal-pad"
              icon="dollar-sign"
            />
            <Button label="Confirmar Aporte" onPress={handleContribute} fullWidth testID="contribute-btn" />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 32, alignItems: 'center', gap: 8 },
  heroName: { color: '#fff', fontSize: 24, marginTop: 4 },
  heroPct: { color: '#fff', fontSize: 48 },
  heroBar: { width: '100%', height: 12, borderRadius: 6, overflow: 'hidden' },
  heroBarFill: { height: 12, borderRadius: 6 },
  heroAmounts: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 16, padding: 16, gap: 4, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 16, marginTop: 4, textAlign: 'center' },
  statLabel: { fontSize: 11, textAlign: 'center' },
  contributeCard: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  contributeTitle: { fontSize: 16 },
});
