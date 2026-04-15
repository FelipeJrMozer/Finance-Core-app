import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { WalletIcon } from '@/components/WalletIcon';
import { WalletSelectorModal } from '@/components/WalletSelectorModal';

export function WalletHeaderButton() {
  const { theme, colors } = useTheme();
  const { wallets, selectedWallet, walletError, isLoading } = useWallet();
  const [visible, setVisible] = useState(false);

  if (!isLoading && wallets.length === 0 && !walletError) return null;
  if (walletError === 'session_expired') return null;

  return (
    <>
      <WalletSelectorModal visible={visible} onClose={() => setVisible(false)} />
      <Pressable
        onPress={() => setVisible(true)}
        testID="wallet-selector"
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: pressed ? theme.surfaceElevated : `${colors.primary}10`,
            borderColor: `${colors.primary}25`,
          },
        ]}
        hitSlop={6}
      >
        <View style={styles.iconWrap}>
          <WalletIcon size={14} color={colors.primary} />
          {selectedWallet && (
            <View
              style={[
                styles.dot,
                { backgroundColor: selectedWallet.color || colors.primary },
              ]}
            />
          )}
        </View>
        <Text
          style={[styles.name, {
            color: selectedWallet ? theme.text : theme.textTertiary,
            fontFamily: 'Inter_500Medium',
          }]}
          numberOfLines={1}
        >
          {isLoading ? 'Carregando…' : selectedWallet ? selectedWallet.name : 'Carteiras'}
        </Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 150,
  },
  iconWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  name: {
    fontSize: 12,
    maxWidth: 100,
  },
});
