import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';

type Tab = 'members' | 'expenses' | 'wallet' | 'goals';

interface Member {
  id: string;
  name: string;
  email?: string;
  role: 'owner' | 'adult' | 'child';
  color: string;
}

interface SharedExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitWith: string[];
  date: string;
}

const STORAGE_KEY = 'pf_familia_state_v1';
const MEMBER_COLORS = ['#0096C7', '#FF6B6B', '#A29BFE', '#2ED573', '#FD9644', '#6C5CE7'];

export default function FamiliaScreen() {
  const { theme, colors, isDark } = useTheme();
  const { user } = useAuth();
  const { accounts, goals } = useFinance();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [familyWalletBalance, setFamilyWalletBalance] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);

  const [mName, setMName] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mRole, setMRole] = useState<'adult' | 'child'>('adult');

  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidBy, setExpPaidBy] = useState<string>('');
  const [expSplit, setExpSplit] = useState<string[]>([]);

  const [fundsAmt, setFundsAmt] = useState('');

  React.useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setMembers(parsed.members || []);
          setExpenses(parsed.expenses || []);
          setFamilyWalletBalance(parsed.balance || 0);
        } catch {}
      } else if (user) {
        const owner: Member = {
          id: user.id || 'owner',
          name: user.name || 'Você',
          email: user.email,
          role: 'owner',
          color: MEMBER_COLORS[0],
        };
        setMembers([owner]);
      }
      setLoaded(true);
    });
  }, [user]);

  React.useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      members, expenses, balance: familyWalletBalance,
    })).catch(() => {});
  }, [members, expenses, familyWalletBalance, loaded]);

  const memberById = (id: string) => members.find((m) => m.id === id);

  const balances = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => { map[m.id] = 0; });
    expenses.forEach((e) => {
      const split = e.splitWith.length > 0 ? e.splitWith : members.map((m) => m.id);
      const share = e.amount / split.length;
      map[e.paidBy] = (map[e.paidBy] || 0) + e.amount;
      split.forEach((mid) => { map[mid] = (map[mid] || 0) - share; });
    });
    return map;
  }, [expenses, members]);

  const totalShared = expenses.reduce((s, e) => s + e.amount, 0);
  const familyGoals = goals.slice(0, 3);

  const addMember = () => {
    if (!mName.trim()) return Alert.alert('Atenção', 'Informe o nome');
    if (members.length >= 5) return Alert.alert('Limite atingido', 'O plano Family suporta até 5 membros.');
    const m: Member = {
      id: `m_${Date.now()}`,
      name: mName.trim(),
      email: mEmail.trim() || undefined,
      role: mRole,
      color: MEMBER_COLORS[members.length % MEMBER_COLORS.length],
    };
    setMembers([...members, m]);
    setMName(''); setMEmail(''); setMRole('adult');
    setShowAddMember(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const removeMember = (id: string) => {
    if (memberById(id)?.role === 'owner') return Alert.alert('Aviso', 'Não é possível remover o proprietário');
    Alert.alert('Remover membro', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => {
        setMembers(members.filter((m) => m.id !== id));
        setExpenses(expenses.filter((e) => e.paidBy !== id && !e.splitWith.includes(id)));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }},
    ]);
  };

  const addExpense = () => {
    if (!expDesc.trim()) return Alert.alert('Atenção', 'Informe a descrição');
    const amt = parseFloat(expAmount.replace(',', '.'));
    if (!amt || amt <= 0) return Alert.alert('Atenção', 'Informe um valor válido');
    if (!expPaidBy) return Alert.alert('Atenção', 'Selecione quem pagou');
    const split = expSplit.length > 0 ? expSplit : members.map((m) => m.id);
    const e: SharedExpense = {
      id: `e_${Date.now()}`,
      description: expDesc.trim(),
      amount: amt,
      paidBy: expPaidBy,
      splitWith: split,
      date: new Date().toISOString().split('T')[0],
    };
    setExpenses([e, ...expenses]);
    setExpDesc(''); setExpAmount(''); setExpSplit([]);
    setShowAddExpense(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addFunds = () => {
    const amt = parseFloat(fundsAmt.replace(',', '.'));
    if (!amt || amt === 0) return;
    setFamilyWalletBalance(familyWalletBalance + amt);
    setFundsAmt('');
    setShowAddFunds(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const TABS: { id: Tab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: 'members', label: 'Membros', icon: 'users' },
    { id: 'expenses', label: 'Despesas', icon: 'pie-chart' },
    { id: 'wallet', label: 'Caixinha', icon: 'briefcase' },
    { id: 'goals', label: 'Metas', icon: 'target' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Família' }} />

      <LinearGradient
        colors={isDark ? ['#1A0B2E', '#091520'] : ['#F3E8FF', '#EBF8FF']}
        style={[styles.hero, { paddingTop: 16 }]}
      >
        <View style={styles.heroRow}>
          <View style={[styles.heroIcon, { backgroundColor: '#7C3AED' }]}>
            <Feather name="users" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Família
            </Text>
            <Text style={[styles.heroSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {members.length} membro{members.length !== 1 ? 's' : ''} • {expenses.length} despesa{expenses.length !== 1 ? 's' : ''} compartilhada{expenses.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={[styles.statsRow]}>
          <View style={[styles.statCard, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Caixinha</Text>
            <Text style={[styles.statValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
              {formatBRL(familyWalletBalance, true)}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: `${colors.danger}15` }]}>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Despesas</Text>
            <Text style={[styles.statValue, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>
              {formatBRL(totalShared, true)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => { setTab(t.id); Haptics.selectionAsync(); }}
            style={[styles.tab, tab === t.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Feather name={t.icon} size={14} color={tab === t.id ? colors.primary : theme.textTertiary} />
            <Text style={[
              styles.tabText,
              { color: tab === t.id ? colors.primary : theme.textTertiary, fontFamily: tab === t.id ? 'Inter_600SemiBold' : 'Inter_400Regular' }
            ]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'members' && (
          <>
            {members.map((m) => {
              const bal = balances[m.id] || 0;
              return (
                <View key={m.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[styles.memberAvatar, { backgroundColor: m.color }]}>
                    <Text style={[styles.memberInitial, { fontFamily: 'Inter_700Bold' }]}>
                      {m.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                      {m.name}
                    </Text>
                    <Text style={[styles.memberMeta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                      {m.email || (m.role === 'owner' ? 'Proprietário' : m.role === 'child' ? 'Dependente' : 'Adulto')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.balLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                      {bal > 0 ? 'A receber' : bal < 0 ? 'A pagar' : 'Quite'}
                    </Text>
                    <Text style={[styles.balVal, { color: bal > 0 ? colors.primary : bal < 0 ? colors.danger : theme.textSecondary, fontFamily: 'Inter_700Bold' }]}>
                      {formatBRL(Math.abs(bal), true)}
                    </Text>
                  </View>
                  {m.role !== 'owner' && (
                    <Pressable onPress={() => removeMember(m.id)} hitSlop={6} style={{ padding: 4 }}>
                      <Feather name="x" size={16} color={theme.textTertiary} />
                    </Pressable>
                  )}
                </View>
              );
            })}
            <Pressable
              onPress={() => { setShowAddMember(true); Haptics.selectionAsync(); }}
              style={[styles.addBtn, { borderColor: colors.primary }]}
            >
              <Feather name="user-plus" size={16} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                Convidar membro
              </Text>
            </Pressable>
          </>
        )}

        {tab === 'expenses' && (
          <>
            {expenses.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="pie-chart" size={40} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                  Nenhuma despesa compartilhada
                </Text>
                <Text style={[styles.emptySub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  Registre uma despesa em conjunto e divida automaticamente entre os membros.
                </Text>
              </View>
            ) : (
              expenses.map((e) => {
                const payer = memberById(e.paidBy);
                const splitCount = e.splitWith.length || members.length;
                const share = e.amount / splitCount;
                return (
                  <View key={e.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'flex-start' }]}>
                    <View style={[styles.expIcon, { backgroundColor: `${payer?.color || colors.primary}20` }]}>
                      <Feather name="dollar-sign" size={16} color={payer?.color || colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[styles.expDesc, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                        {e.description}
                      </Text>
                      <Text style={[styles.expMeta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        Pago por {payer?.name || '—'} • Dividido por {splitCount} • {formatBRL(share, true)} cada
                      </Text>
                    </View>
                    <Text style={[styles.expAmt, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>
                      {formatBRL(e.amount, true)}
                    </Text>
                  </View>
                );
              })
            )}
            <Pressable
              onPress={() => {
                if (members.length === 0) return Alert.alert('Atenção', 'Adicione membros primeiro');
                setExpPaidBy(members[0]?.id || '');
                setShowAddExpense(true);
                Haptics.selectionAsync();
              }}
              style={[styles.addBtn, { borderColor: colors.primary }]}
            >
              <Feather name="plus" size={16} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                Nova despesa compartilhada
              </Text>
            </Pressable>
          </>
        )}

        {tab === 'wallet' && (
          <>
            <View style={[styles.walletCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="briefcase" size={28} color="#7C3AED" />
              <Text style={[styles.walletLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Saldo da caixinha familiar
              </Text>
              <Text style={[styles.walletBal, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                {formatBRL(familyWalletBalance)}
              </Text>
              <Text style={[styles.walletSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular', textAlign: 'center' }]}>
                Use a caixinha para acumular dinheiro destinado a despesas conjuntas (mercado, viagens, contas).
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Pressable
                  onPress={() => { setFundsAmt(''); setShowAddFunds(true); Haptics.selectionAsync(); }}
                  style={[styles.walletBtn, { backgroundColor: colors.primary }]}
                >
                  <Feather name="plus" size={14} color="#000" />
                  <Text style={[styles.walletBtnText, { color: '#000', fontFamily: 'Inter_600SemiBold' }]}>Depositar</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Alert.prompt?.('Retirar', 'Valor a retirar:', (text) => {
                      if (!text) return;
                      const v = parseFloat(text.replace(',', '.'));
                      if (v > 0) setFamilyWalletBalance(Math.max(0, familyWalletBalance - v));
                    }) ?? Alert.alert('Indisponível', 'Função disponível apenas em iOS. Use a opção Depositar com valor negativo.');
                  }}
                  style={[styles.walletBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}
                >
                  <Feather name="minus" size={14} color={theme.text} />
                  <Text style={[styles.walletBtnText, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Retirar</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
              <Feather name="info" size={14} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>
                A caixinha é local e ficará vinculada à sua conta. Em uma futura versão, será sincronizada com o web.
              </Text>
            </View>
          </>
        )}

        {tab === 'goals' && (
          <>
            {familyGoals.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="target" size={40} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                  Nenhuma meta familiar
                </Text>
                <Text style={[styles.emptySub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  Crie metas (viagem, reforma, fundo de emergência) para acompanhar o progresso em conjunto.
                </Text>
                <Pressable
                  onPress={() => router.push('/(more)/goals')}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                >
                  <Feather name="plus" size={16} color="#000" />
                  <Text style={[styles.primaryBtnText, { color: '#000', fontFamily: 'Inter_600SemiBold' }]}>Nova meta</Text>
                </Pressable>
              </View>
            ) : (
              familyGoals.map((g) => {
                const pct = Math.min(g.currentAmount / g.targetAmount, 1);
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => router.push('/(more)/goals')}
                    style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'flex-start' }]}
                  >
                    <View style={[styles.expIcon, { backgroundColor: `${g.color}20` }]}>
                      <Feather name="target" size={16} color={g.color} />
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={[styles.expDesc, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                        {g.name}
                      </Text>
                      <View style={[styles.progressBg, { backgroundColor: theme.surfaceElevated }]}>
                        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: g.color }]} />
                      </View>
                      <Text style={[styles.expMeta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        {formatBRL(g.currentAmount, true)} de {formatBRL(g.targetAmount, true)} • {(pct * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal visible={showAddMember} transparent animationType="slide" onRequestClose={() => setShowAddMember(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowAddMember(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Convidar membro
            </Text>
            <TextInput
              value={mName} onChangeText={setMName} placeholder="Nome" placeholderTextColor={theme.textTertiary}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
            />
            <TextInput
              value={mEmail} onChangeText={setMEmail} placeholder="Email (opcional)" placeholderTextColor={theme.textTertiary}
              keyboardType="email-address" autoCapitalize="none"
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['adult', 'child'] as const).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setMRole(r)}
                  style={[styles.roleChip, {
                    backgroundColor: mRole === r ? colors.primary : theme.background,
                    borderColor: mRole === r ? colors.primary : theme.border,
                  }]}
                >
                  <Text style={[styles.roleChipText, { color: mRole === r ? '#000' : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                    {r === 'adult' ? 'Adulto' : 'Dependente'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={addMember} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.primaryBtnText, { color: '#000', fontFamily: 'Inter_600SemiBold' }]}>Adicionar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Expense Modal */}
      <Modal visible={showAddExpense} transparent animationType="slide" onRequestClose={() => setShowAddExpense(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowAddExpense(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Despesa compartilhada
            </Text>
            <TextInput
              value={expDesc} onChangeText={setExpDesc} placeholder="Descrição (ex: Mercado)" placeholderTextColor={theme.textTertiary}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
            />
            <TextInput
              value={expAmount} onChangeText={setExpAmount} placeholder="Valor (ex: 250,00)" placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
            />
            <Text style={[styles.modalLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Pago por</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setExpPaidBy(m.id)}
                  style={[styles.roleChip, {
                    backgroundColor: expPaidBy === m.id ? m.color : theme.background,
                    borderColor: expPaidBy === m.id ? m.color : theme.border,
                  }]}
                >
                  <Text style={[styles.roleChipText, { color: expPaidBy === m.id ? '#fff' : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                    {m.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.modalLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Dividido entre (vazio = todos)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {members.map((m) => {
                const sel = expSplit.includes(m.id);
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setExpSplit(sel ? expSplit.filter((x) => x !== m.id) : [...expSplit, m.id])}
                    style={[styles.roleChip, {
                      backgroundColor: sel ? `${m.color}30` : theme.background,
                      borderColor: sel ? m.color : theme.border,
                    }]}
                  >
                    <Text style={[styles.roleChipText, { color: sel ? m.color : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                      {sel ? '✓ ' : ''}{m.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={addExpense} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.primaryBtnText, { color: '#000', fontFamily: 'Inter_600SemiBold' }]}>Registrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Funds Modal */}
      <Modal visible={showAddFunds} transparent animationType="slide" onRequestClose={() => setShowAddFunds(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowAddFunds(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Depositar na caixinha
            </Text>
            <TextInput
              value={fundsAmt} onChangeText={setFundsAmt} placeholder="Valor" placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad" autoFocus
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
            />
            <Pressable onPress={addFunds} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.primaryBtnText, { color: '#000', fontFamily: 'Inter_600SemiBold' }]}>Confirmar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 22 },
  heroSub: { fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, gap: 4 },
  statLabel: { fontSize: 11 },
  statValue: { fontSize: 16 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderBottomColor: 'transparent', borderBottomWidth: 2 },
  tabText: { fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontSize: 16, color: '#fff' },
  memberName: { fontSize: 14 },
  memberMeta: { fontSize: 12, marginTop: 2 },
  balLabel: { fontSize: 10 },
  balVal: { fontSize: 13, marginTop: 2 },
  expIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  expDesc: { fontSize: 14 },
  expMeta: { fontSize: 12 },
  expAmt: { fontSize: 14 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed' },
  addBtnText: { fontSize: 14 },
  empty: { alignItems: 'center', gap: 10, padding: 32 },
  emptyText: { fontSize: 16 },
  emptySub: { fontSize: 13, textAlign: 'center' },
  walletCard: { padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 6 },
  walletLabel: { fontSize: 13 },
  walletBal: { fontSize: 32 },
  walletSub: { fontSize: 12, marginTop: 4 },
  walletBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  walletBtnText: { fontSize: 13 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  primaryBtnText: { fontSize: 15 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 12 },
  modalTitle: { fontSize: 18, marginBottom: 4 },
  modalLabel: { fontSize: 12, marginTop: 4 },
  input: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, fontSize: 15 },
  roleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  roleChipText: { fontSize: 13 },
});
