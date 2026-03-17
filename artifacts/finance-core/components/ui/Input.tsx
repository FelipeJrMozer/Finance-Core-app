import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Feather.glyphMap;
  containerStyle?: ViewStyle;
  testID?: string;
}

export function Input({ label, error, icon, containerStyle, testID, ...props }: InputProps) {
  const { theme, colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputContainer,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: error ? colors.danger : focused ? colors.primary : theme.border,
          borderWidth: error || focused ? 1.5 : 1,
        }
      ]}>
        {icon && (
          <Feather name={icon} size={18} color={focused ? colors.primary : theme.textTertiary} style={styles.icon} />
        )}
        <TextInput
          testID={testID}
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          style={[
            styles.input,
            {
              color: theme.text,
              fontFamily: 'Inter_400Regular',
              paddingLeft: icon ? 0 : 4,
            }
          ]}
          placeholderTextColor={theme.textTertiary}
        />
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.danger, fontFamily: 'Inter_400Regular' }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  icon: {},
  input: { flex: 1, fontSize: 16 },
  error: { fontSize: 12 },
});
