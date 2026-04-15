import React from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useWallet, type Wallet } from '@/context/WalletContext';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function WalletSelectorModal({ visible, onClose }: Props) {
  const { theme, colors } = useTheme();
  const { wallets, selectedWallet, selectWallet, isLoading } = useWallet();

  const handleSelect = async (wallet: Wallet) => {
    Haptics.selectionAsync();
    await selectWallet(wallet);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
            Carteiras
          </Text>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.surfaceElevated }]}>
            <Feather name="x" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Selecione a carteira para visualizar os dados
        </Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
        ) : wallets.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="briefcase" size={40} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Nenhuma carteira encontrada
            </Text>
            <Text style={[styles.emptyHint, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Crie uma carteira no sistema web do Pilar Financeiro
            </Text>
          </View>
        ) : (
          <FlatList
            data={wallets}
            keyExtractor={(w) => w.id}
            contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
            renderItem={({ item }) => {
              const isSelected = selectedWallet?.id === item.id;
              return (
                <Pressable
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => [
                    styles.walletRow,
                    {
                      backgroundColor: isSelected ? `${colors.primary}15` : theme.surfaceElevated,
                      borderColor: isSelected ? colors.primary : theme.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={[styles.walletIcon, { backgroundColor: `${colors.primary}20` }]}>
                    <Feather name="briefcase" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.walletInfo}>
                    <Text style={[styles.walletName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text style={[styles.walletDesc, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                    ) : item.isDefault ? (
                      <Text style={[styles.walletDesc, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>
                        Carteira padrão
                      </Text>
                    ) : null}
                  </View>
                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={14} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 15,
  },
  walletDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
