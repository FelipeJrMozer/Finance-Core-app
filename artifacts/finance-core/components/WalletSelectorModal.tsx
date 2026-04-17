import React from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Linking
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useWallet, type Wallet } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import { WalletIcon } from '@/components/WalletIcon';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function getWalletColor(wallet: Wallet, index: number): string {
  const PALETTE = [
    '#0096C7', '#6C5CE7', '#00B894', '#FD9644', '#E84393',
    '#2ED573', '#F53B57', '#1E90FF', '#A29BFE', '#FDCB6E',
  ];
  if (wallet.color) return wallet.color;
  return PALETTE[index % PALETTE.length];
}

export function WalletSelectorModal({ visible, onClose }: Props) {
  const { theme, colors, isDark } = useTheme();
  const { wallets, selectedWallet, selectWallet, isLoading, walletError, walletDebug, refreshWallets } = useWallet();
  const { logout } = useAuth();
  const router = useRouter();

  const handleReLogin = async () => {
    Haptics.selectionAsync();
    onClose();
    await logout();
    router.replace('/(auth)/login');
  };

  const handleSelect = async (wallet: Wallet) => {
    Haptics.selectionAsync();
    await selectWallet(wallet);
    onClose();
  };

  const handleManage = () => {
    Haptics.selectionAsync();
    Linking.openURL('https://pilar-financeiro.replit.app');
    onClose();
  };

  const handleNew = () => {
    Haptics.selectionAsync();
    Linking.openURL('https://pilar-financeiro.replit.app');
    onClose();
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refreshWallets();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose} />

      <View style={[
        styles.sheet,
        {
          backgroundColor: isDark ? '#1A1A2E' : '#fff',
          borderColor: theme.border,
          shadowColor: '#000',
        }
      ]}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <WalletIcon size={20} color={colors.primary} />
            <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Carteiras
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: theme.surfaceElevated }]}
            hitSlop={8}
          >
            <Feather name="x" size={16} color={theme.textSecondary} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.hintText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Carregando carteiras…
            </Text>
          </View>
        ) : walletError === 'network' ? (
          <View style={styles.centerBox}>
            <Feather name="wifi-off" size={32} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Sem conexão com o servidor
            </Text>
            <Text style={[styles.hintText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Verifique sua internet e tente novamente
            </Text>
            <Pressable
              onPress={handleRetry}
              style={[styles.retryBtn, { backgroundColor: `${colors.primary}20` }]}
            >
              <Feather name="refresh-cw" size={14} color={colors.primary} />
              <Text style={[styles.retryTextAlt, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                Tentar novamente
              </Text>
            </Pressable>
          </View>
        ) : walletError === 'session_expired' ? (
          <View style={styles.centerBox}>
            <Feather name="lock" size={32} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Sessão expirada
            </Text>
            <Text style={[styles.hintText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Faça login novamente para carregar suas carteiras
            </Text>
            {walletDebug ? (
              <Text selectable style={{ fontSize: 10, color: theme.textTertiary, marginTop: 8, paddingHorizontal: 8, textAlign: 'center' }}>
                {walletDebug}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={handleRetry}
                style={[styles.retryBtn, { backgroundColor: `${colors.primary}20` }]}
              >
                <Feather name="refresh-cw" size={14} color={colors.primary} />
                <Text style={[styles.retryTextAlt, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                  Tentar de novo
                </Text>
              </Pressable>
              <Pressable
                onPress={handleReLogin}
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="log-in" size={14} color="#fff" />
                <Text style={[styles.retryTextAlt, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                  Fazer login
                </Text>
              </Pressable>
            </View>
          </View>
        ) : walletError ? (
          <View style={styles.centerBox}>
            <Feather name="cloud-off" size={32} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Carteiras indisponíveis
            </Text>
            <Text style={[styles.hintText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Use o sistema web para gerenciar carteiras
            </Text>
            <Pressable
              onPress={handleRetry}
              style={[styles.retryBtn, { backgroundColor: `${colors.primary}20` }]}
            >
              <Feather name="refresh-cw" size={14} color={colors.primary} />
              <Text style={[styles.retryTextAlt, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                Tentar novamente
              </Text>
            </Pressable>
          </View>
        ) : wallets.length === 0 ? (
          <View style={styles.centerBox}>
            <WalletIcon size={36} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Nenhuma carteira encontrada
            </Text>
            <Text style={[styles.hintText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Crie uma carteira no sistema web
            </Text>
            <Pressable
              onPress={handleRetry}
              style={[styles.retryBtn, { backgroundColor: `${colors.primary}20` }]}
            >
              <Feather name="refresh-cw" size={14} color={colors.primary} />
              <Text style={[styles.retryTextAlt, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                Recarregar
              </Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 260 }}
          >
            {wallets.map((wallet, index) => {
              const isSelected = selectedWallet?.id === wallet.id;
              const dotColor = getWalletColor(wallet, index);
              return (
                <Pressable
                  key={wallet.id}
                  onPress={() => handleSelect(wallet)}
                  style={({ pressed }) => [
                    styles.walletRow,
                    {
                      backgroundColor: isSelected
                        ? `${dotColor}12`
                        : pressed ? theme.surfaceElevated : 'transparent',
                    },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <Text
                    style={[
                      styles.walletName,
                      {
                        color: isSelected ? dotColor : theme.text,
                        fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                        flex: 1,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {wallet.name}
                  </Text>
                  {isSelected && (
                    <Feather name="check" size={16} color={dotColor} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Pressable
          onPress={handleManage}
          style={({ pressed }) => [
            styles.actionRow,
            { backgroundColor: pressed ? theme.surfaceElevated : 'transparent' },
          ]}
        >
          <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Feather name="settings" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.actionText, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
            Gerenciar carteiras
          </Text>
          <Feather name="external-link" size={13} color={theme.textTertiary} />
        </Pressable>

        <Pressable
          onPress={handleNew}
          style={({ pressed }) => [
            styles.actionRow,
            { backgroundColor: pressed ? theme.surfaceElevated : 'transparent' },
          ]}
        >
          <View style={[styles.actionIcon, { backgroundColor: `${colors.success || '#00B894'}15` }]}>
            <Feather name="plus" size={14} color={colors.success || '#00B894'} />
          </View>
          <Text style={[styles.actionText, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
            Nova carteira
          </Text>
          <Feather name="external-link" size={13} color={theme.textTertiary} />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingBottom: 32,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
    gap: 6,
  },
  errorTitle: {
    fontSize: 15,
    marginTop: 6,
  },
  errorDetail: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 6,
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  retryText: {
    fontSize: 13,
    color: '#fff',
  },
  retryTextAlt: {
    fontSize: 13,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  walletName: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    flex: 1,
  },
});
