import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  size?: number;
  color?: string;
}

export function WalletIcon({ size = 22, color = '#0096C7' }: Props) {
  const iconSize = Math.round(size * 0.85);
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Feather name="credit-card" size={iconSize} color={color} />
    </View>
  );
}
