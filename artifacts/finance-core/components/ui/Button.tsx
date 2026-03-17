import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading, disabled, fullWidth, style, textStyle, testID
}: ButtonProps) {
  const { theme, colors } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const bgColor = {
    primary: colors.primary,
    secondary: theme.surfaceElevated,
    danger: colors.danger,
    ghost: 'transparent',
  }[variant];

  const textColor = {
    primary: '#000',
    secondary: theme.text,
    danger: '#fff',
    ghost: colors.primary,
  }[variant];

  const padding = { sm: 10, md: 14, lg: 18 }[size];
  const fontSize = { sm: 13, md: 15, lg: 17 }[size];

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bgColor,
          paddingVertical: padding,
          paddingHorizontal: padding * 1.6,
          opacity: pressed ? 0.8 : disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          ...(variant !== 'ghost' && variant !== 'secondary' ? {} : {
            borderWidth: 1,
            borderColor: variant === 'secondary' ? theme.border : 'transparent',
          }),
        },
        fullWidth && { width: '100%' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize, fontFamily: 'Inter_600SemiBold' }, textStyle]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  text: {
    textAlign: 'center',
  },
});
