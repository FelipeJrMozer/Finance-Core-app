import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, DARF } from '@/context/FinanceContext';
import { formatBRL, formatDate } from '@/utils/formatters';

export default function DARFsScreen() {
  const { theme, colors } = useTheme();
  const { darfs, markDARFPaid } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const unpaid = darfs.filter((d) => !d.paid);
  const paid = darfs.filter((d) => d.paid);
  const totalUnpaid = unpaid.reduce((s, d) => s + d.amount, 0);

  const handleMarkPaid = (darf: DARF) => {
    Alert.alert('Marcar como Pago', `Confirmar pagamento de ${formatBRL(darf.amount)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar', onPress: () => {
          markDARFPaid(darf.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }} tintColor={colors.primary} />}
    >
      {/* Summary */}
      {unpaid.length > 0 ? (
        <LinearGradient colors={[colors.warning, '#E65100']} style={styles.alert}>
          <View style={styles.alertIcon}>
            <Feather name="alert-triangle" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertTitle, { fontFamily: 'Inter_700Bold' }]}>
              {unpaid.length} DARF{unpaid.length > 1 ? 's' : ''} pendente{unpaid.length > 1 ? 's' : ''}
            </Text>
            <Text style={[styles.alertValue, { fontFamily: 'Inter_600SemiBold' }]}>
              Total: {formatBRL(totalUnpaid)}
            </Text>
          </View>
        </LinearGradient>
      ) : (
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.alert}>
          <View style={styles.alertIcon}>
            <Feather name="check-circle" size={24} color="#000" />
          </View>
          <Text style={[styles.alertTitle, { color: '#000', fontFamily: 'Inter_700Bold' }]}>
            Sem DARFs pendentes
          </Text>
        </LinearGradient>
      )}

      {/* Info Card */}
      <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Feather name="info" size={16} color={colors.accent} />
        <Text style={[styles.infoText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          DARF de renda variável deve ser pago até o último dia útil do mês seguinte. Vendas acima de R$ 20.000/mês são tributadas a 15%.
        </Text>
      </View>

      {/* Pending DARFs */}
      {unpaid.length > 0 && (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Pendentes
          </Text>
          <View style={styles.list}>
            {unpaid.map((darf) => {
              const isOverdue = new Date(darf.dueDate) < new Date();
              return (
                <View key={darf.id} style={[styles.darfCard, { backgroundColor: theme.surface, borderColor: isOverdue ? colors.danger : theme.border }]}>
                  <View style={styles.darfHeader}>
                    <View style={[styles.darfIcon, { backgroundColor: isOverdue ? `${colors.danger}20` : `${colors.warning}20` }]}>
                      <Feather name="file-text" size={20} color={isOverdue ? colors.danger : colors.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.darfType, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                        {darf.type}
                      </Text>
                      <Text style={[styles.darfMonth, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        Competência: {darf.month}
                      </Text>
                    </View>
                    {isOverdue && (
                      <View style={[styles.overdueTag, { backgroundColor: `${colors.danger}15` }]}>
                        <Text style={[styles.overdueText, { color: colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
                          Vencido
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.darfAmounts}>
                    <Text style={[styles.darfAmount, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                      {formatBRL(darf.amount)}
                    </Text>
                    <Text style={[styles.darfDue, { color: isOverdue ? colors.danger : theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      Vencimento: {formatDate(darf.dueDate)}
                    </Text>
                  </View>
                  <Pressable
                    testID={`mark-paid-${darf.id}`}
                    onPress={() => handleMarkPaid(darf)}
                    style={({ pressed }) => [
                      styles.payBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: pressed ? 0.8 : 1,
                      }
                    ]}
                  >
                    <Feather name="check" size={16} color="#000" />
                    <Text style={[styles.payText, { fontFamily: 'Inter_600SemiBold' }]}>
                      Marcar como Pago
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Paid DARFs */}
      {paid.length > 0 && (
        <View>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Pagos
          </Text>
          <View style={styles.list}>
            {paid.map((darf) => (
              <View key={darf.id} style={[styles.darfCard, { backgroundColor: theme.surface, borderColor: `${colors.primary}30` }]}>
                <View style={styles.darfHeader}>
                  <View style={[styles.darfIcon, { backgroundColor: `${colors.primary}20` }]}>
                    <Feather name="check-circle" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.darfType, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                      {darf.type}
                    </Text>
                    <Text style={[styles.darfMonth, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                      Pago em {darf.paidDate ? formatDate(darf.paidDate) : '—'}
                    </Text>
                  </View>
                  <Text style={[styles.darfAmount, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                    {formatBRL(darf.amount)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  alert: { borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  alertIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  alertTitle: { color: '#fff', fontSize: 18 },
  alertValue: { color: '#fff', fontSize: 15, marginTop: 2 },
  infoCard: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 18, marginBottom: 12 },
  list: { gap: 12 },
  darfCard: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  darfHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  darfIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  darfType: { fontSize: 15 },
  darfMonth: { fontSize: 12, marginTop: 2 },
  overdueTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  overdueText: { fontSize: 11 },
  darfAmounts: { gap: 2 },
  darfAmount: { fontSize: 24 },
  darfDue: { fontSize: 13 },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 12, borderRadius: 10,
  },
  payText: { color: '#000', fontSize: 15 },
});
