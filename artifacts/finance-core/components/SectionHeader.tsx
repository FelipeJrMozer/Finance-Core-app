import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface SectionHeaderProps {
  title: string;
  icon?: keyof typeof Feather.glyphMap;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, icon, action }: SectionHeaderProps) {
  const { theme, colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {icon && (
          <Feather name={icon} size={14} color={theme.textTertiary} style={styles.icon} />
        )}
        <Text style={[styles.title, { color: theme.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
          {title.toUpperCase()}
        </Text>
      </View>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={[styles.action, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icon: {},
  title: { fontSize: 11, letterSpacing: 0.8 },
  action: { fontSize: 13 },
});
