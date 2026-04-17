import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useWallet, type Wallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/Button';

export default function WalletsListScreen() {
  const { theme, colors } = useTheme();
  const { wallets, selectedWallet, isLoading, deleteWallet, setDefaultWallet, refreshWallets } = useWallet();
  const insets = useSafeAreaInsets();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const handleDelete = (w: Wallet) => {
    if (w.isDefault) {
      Alert.alert('Não permitido', 'Não é possível excluir a carteira padrão. Defina outra como padrão antes.');
      return;
    }
    Alert.alert(
      'Excluir carteira',
      `Excluir "${w.name}"? As transações associadas continuam no servidor, mas você não verá mais essa carteira.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusyId(w.id);
              await deleteWallet(w.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              Alert.alert('Erro', String(e instanceof Error ? e.message : e));
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const handleSetDefault = async (w: Wallet) => {
    if (w.isDefault) return;
    try {
      setBusyId(w.id);
      await setDefaultWallet(w.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Erro', String(e instanceof Error ? e.message : e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshWallets} tintColor={colors.primary} />}
    >
      <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Carteiras</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
        Você pode ter até 5 carteiras. Cada carteira tem suas próprias contas, transações, metas e orçamentos.
      </Text>

      {isLoading && wallets.length === 0 ? (
        <View style={{ padding: 30, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {wallets.map((w) => {
            const isSelected = selectedWallet?.id === w.id;
            const busy = busyId === w.id;
            return (
              <View
                key={w.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: isSelected ? colors.primary : theme.border,
                    borderWidth: isSelected ? 1.5 : 1,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.dot, { backgroundColor: w.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                      {w.name}
                    </Text>
                    {w.description ? (
                      <Text style={[styles.desc, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
                        {w.description}
                      </Text>
                    ) : null}
                  </View>
                  {w.isDefault ? (
                    <View style={[styles.badge, { backgroundColor: `${colors.primary}20` }]}>
                      <Feather name="star" size={11} color={colors.primary} />
                      <Text style={[styles.badgeText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>Padrão</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => router.push(`/wallets/add?id=${w.id}`)}
                    style={[styles.actionBtn, { backgroundColor: theme.surface }]}
                    disabled={busy}
                  >
                    <Feather name="edit-2" size={13} color={theme.textSecondary} />
                    <Text style={[styles.actionText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Editar</Text>
                  </Pressable>

                  {!w.isDefault && (
                    <Pressable
                      onPress={() => handleSetDefault(w)}
                      style={[styles.actionBtn, { backgroundColor: theme.surface }]}
                      disabled={busy}
                    >
                      <Feather name="star" size={13} color={theme.textSecondary} />
                      <Text style={[styles.actionText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Padrão</Text>
                    </Pressable>
                  )}

                  {!w.isDefault && (
                    <Pressable
                      onPress={() => handleDelete(w)}
                      style={[styles.actionBtn, { backgroundColor: `${colors.danger}15` }]}
                      disabled={busy}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <>
                          <Feather name="trash-2" size={13} color={colors.danger} />
                          <Text style={[styles.actionText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>Excluir</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ marginTop: 16 }}>
        <Button
          label={wallets.length >= 5 ? 'Limite de 5 carteiras atingido' : 'Nova carteira'}
          onPress={() => router.push('/wallets/add')}
          disabled={wallets.length >= 5}
          fullWidth
          size="lg"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  title: { fontSize: 22 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  card: { borderRadius: 14, padding: 14, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  name: { fontSize: 15 },
  desc: { fontSize: 12, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9 },
  actionText: { fontSize: 12 },
});
