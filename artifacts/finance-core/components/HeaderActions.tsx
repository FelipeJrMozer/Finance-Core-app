import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import { WalletIcon } from '@/components/WalletIcon';
import { WalletSelectorModal } from '@/components/WalletSelectorModal';

interface Props {
  showProfile?: boolean;
}

export function HeaderActions({ showProfile = true }: Props) {
  const { theme, colors, valuesVisible, toggleValuesVisible } = useTheme();
  const { user } = useAuth();
  const { selectedWallet } = useWallet();
  const [walletVisible, setWalletVisible] = useState(false);

  return (
    <>
      <WalletSelectorModal visible={walletVisible} onClose={() => setWalletVisible(false)} />
      <View style={styles.row}>
        {/* Carteira */}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setWalletVisible(true); }}
          style={[styles.iconBtn, {
            backgroundColor: `${colors.primary}15`,
            borderColor: `${colors.primary}30`,
          }]}
          testID="wallet-selector"
        >
          {selectedWallet && (
            <View style={[styles.walletDot, { backgroundColor: selectedWallet.color || colors.primary }]} />
          )}
          <WalletIcon size={17} color={colors.primary} />
        </Pressable>

        {/* Visualizar (ocultar/mostrar valores) */}
        <Pressable
          onPress={() => { toggleValuesVisible(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.iconBtn, {
            backgroundColor: `${colors.primary}15`,
            borderColor: `${colors.primary}30`,
          }]}
          testID="toggle-values"
        >
          <Feather name={valuesVisible ? 'eye' : 'eye-off'} size={17} color={colors.primary} />
        </Pressable>

        {/* Perfil */}
        {showProfile && (
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push('/(more)/settings'); }}
            style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
            testID="profile-avatar"
          >
            <Text style={[styles.avatarInitial, { fontFamily: 'Inter_700Bold' }]}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
    zIndex: 1,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    color: '#000',
  },
});
