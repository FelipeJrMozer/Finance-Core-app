import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export function EmptyState({ icon, title, description, action, style }: EmptyStateProps) {
  const { theme, colors } = useTheme();
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15` }]}>
        <Feather name={icon} size={32} color={theme.textTertiary} />
      </View>
      <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
        {title}
      </Text>
      <Text style={[styles.desc, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
        {description}
      </Text>
      {action && (
        <Pressable
          onPress={() => { Haptics.selectionAsync(); action.onPress(); }}
          style={[styles.btn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.btnText, { fontFamily: 'Inter_600SemiBold' }]}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 18, textAlign: 'center' },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { fontSize: 15, color: '#fff' },
});
