import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, Goal } from '@/context/FinanceContext';
import { formatBRL, formatDate } from '@/utils/formatters';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function GoalCard({ goal, onContribute }: { goal: Goal; onContribute: (g: Goal) => void }) {
  const { theme, colors, maskValue } = useTheme();
  const pct = Math.min(goal.currentAmount / goal.targetAmount, 1);
  const remaining = goal.targetAmount - goal.currentAmount;
  const daysLeft = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000));
  const monthlyNeeded = daysLeft > 0 ? remaining / (daysLeft / 30) : 0;

  return (
    <View style={[styles.goalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.goalHeader}>
        <View style={[styles.goalIconBadge, { backgroundColor: `${goal.color}20` }]}>
          <Feather name={goal.icon as any || 'target'} size={20} color={goal.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.goalName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{goal.name}</Text>
          <Text style={[styles.goalDeadline, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            Prazo: {formatDate(goal.deadline)} • {daysLeft} dias
          </Text>
        </View>
        {pct >= 1 && (
          <View style={[styles.completedBadge, { backgroundColor: `${colors.primary}20` }]}>
            <Feather name="check" size={14} color={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.goalAmounts}>
        <Text style={[styles.goalCurrent, { color: goal.color, fontFamily: 'Inter_700Bold' }]}>
          {maskValue(formatBRL(goal.currentAmount))}
        </Text>
        <Text style={[styles.goalOf, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          de {maskValue(formatBRL(goal.targetAmount))}
        </Text>
        <Text style={[styles.goalPct, { color: goal.color, fontFamily: 'Inter_600SemiBold' }]}>
          {(pct * 100).toFixed(1)}%
        </Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: theme.surfaceElevated }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: pct >= 1 ? colors.primary : goal.color,
              width: `${pct * 100}%`,
            }
          ]}
        />
      </View>

      {pct < 1 && (
        <View style={styles.goalFooter}>
          <Text style={[styles.monthlyNeeded, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Aportar {maskValue(formatBRL(monthlyNeeded))}/mês para atingir
          </Text>
          <Pressable
            onPress={() => onContribute(goal)}
            style={[styles.contributeBtn, { backgroundColor: `${goal.color}20`, borderColor: goal.color }]}
          >
            <Feather name="plus" size={14} color={goal.color} />
            <Text style={[styles.contributeText, { color: goal.color, fontFamily: 'Inter_500Medium' }]}>
              Aportar
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function GoalsScreen() {
  const { theme, colors, maskValue } = useTheme();
  const { goals, addContribution, addGoal } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [contributing, setContributing] = useState<Goal | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('2027-12-31');

  const handleContribute = () => {
    const amount = parseFloat(contribAmount.replace(',', '.'));
    if (!contributing || isNaN(amount) || amount <= 0) return;
    addContribution(contributing.id, amount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setContributing(null);
    setContribAmount('');
  };

  const handleAddGoal = () => {
    if (!newGoalName.trim() || !newGoalTarget) return;
    const target = parseFloat(newGoalTarget.replace(',', '.'));
    if (isNaN(target) || target <= 0) return;
    addGoal({
      name: newGoalName.trim(),
      targetAmount: target,
      currentAmount: 0,
      deadline: newGoalDeadline,
      icon: 'target',
      color: colors.primary,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAddGoal(false);
    setNewGoalName('');
    setNewGoalTarget('');
  };

  const totalProgress = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }} tintColor={colors.primary} />}
    >
      {/* Summary */}
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.summary}>
        <Text style={[styles.summaryLabel, { fontFamily: 'Inter_400Regular' }]}>Total Acumulado</Text>
        <Text style={[styles.summaryValue, { fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(totalProgress))}</Text>
        <Text style={[styles.summaryMeta, { fontFamily: 'Inter_400Regular' }]}>
          de {maskValue(formatBRL(totalTarget))} em {goals.length} metas
        </Text>
      </LinearGradient>

      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Suas Metas
        </Text>
        <Pressable
          onPress={() => setShowAddGoal(!showAddGoal)}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={18} color="#000" />
        </Pressable>
      </View>

      {showAddGoal && (
        <View style={[styles.addGoalForm, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.formTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Nova Meta</Text>
          <Input label="Nome" value={newGoalName} onChangeText={setNewGoalName} placeholder="Ex: Reserva de emergência" icon="target" />
          <Input label="Valor alvo (R$)" value={newGoalTarget} onChangeText={setNewGoalTarget} placeholder="0,00" keyboardType="decimal-pad" icon="dollar-sign" />
          <Input label="Prazo (AAAA-MM-DD)" value={newGoalDeadline} onChangeText={setNewGoalDeadline} placeholder="2027-12-31" icon="calendar" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button label="Cancelar" onPress={() => setShowAddGoal(false)} variant="secondary" style={{ flex: 1 }} />
            <Button label="Salvar" onPress={handleAddGoal} style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {contributing && (
        <View style={[styles.addGoalForm, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.formTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Aportar em {contributing.name}
          </Text>
          <Input
            label="Valor do aporte (R$)"
            value={contribAmount}
            onChangeText={setContribAmount}
            placeholder="0,00"
            keyboardType="decimal-pad"
            icon="dollar-sign"
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button label="Cancelar" onPress={() => setContributing(null)} variant="secondary" style={{ flex: 1 }} />
            <Button label="Confirmar" onPress={handleContribute} style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {goals.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="target" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Nenhuma meta</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Defina suas metas financeiras
          </Text>
        </View>
      ) : (
        goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onContribute={setContributing} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: 20, padding: 24, gap: 4, alignItems: 'center' },
  summaryLabel: { color: 'rgba(0,0,0,0.7)', fontSize: 14 },
  summaryValue: { color: '#000', fontSize: 36 },
  summaryMeta: { color: 'rgba(0,0,0,0.7)', fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18 },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addGoalForm: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  formTitle: { fontSize: 16 },
  goalCard: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalIconBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalName: { fontSize: 16 },
  goalDeadline: { fontSize: 12, marginTop: 2 },
  completedBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  goalAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  goalCurrent: { fontSize: 22 },
  goalOf: { fontSize: 14, flex: 1 },
  goalPct: { fontSize: 15 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthlyNeeded: { fontSize: 12, flex: 1 },
  contributeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  contributeText: { fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
