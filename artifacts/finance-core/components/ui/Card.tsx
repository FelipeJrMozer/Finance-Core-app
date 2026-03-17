import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  padding?: number;
}

export function Card({ children, style, elevated, padding = 16 }: CardProps) {
  const { theme } = useTheme();
  return (
    <View style={[
      styles.card,
      {
        backgroundColor: elevated ? theme.surfaceElevated : theme.surface,
        borderColor: theme.border,
        padding,
      },
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
});
