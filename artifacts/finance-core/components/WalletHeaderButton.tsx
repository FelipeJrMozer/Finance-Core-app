import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { WalletIcon } from '@/components/WalletIcon';
import { WalletSelectorModal } from '@/components/WalletSelectorModal';

export function WalletHeaderButton() {
  const { theme, colors } = useTheme();
  const { selectedWallet } = useWallet();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <WalletSelectorModal visible={visible} onClose={() => setVisible(false)} />
      <Pressable
        onPress={() => setVisible(true)}
        testID="wallet-selector"
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: pressed ? theme.surfaceElevated : 'transparent',
          },
        ]}
        hitSlop={6}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
          <WalletIcon size={16} color={colors.primary} />
          {selectedWallet && (
            <View
              style={[
                styles.dot,
                { backgroundColor: selectedWallet.color || colors.primary },
              ]}
            />
          )}
        </View>
        {selectedWallet && (
          <Text
            style={[styles.name, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}
            numberOfLines={1}
          >
            {selectedWallet.name}
          </Text>
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: 160,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  name: {
    fontSize: 12,
    maxWidth: 110,
  },
});
