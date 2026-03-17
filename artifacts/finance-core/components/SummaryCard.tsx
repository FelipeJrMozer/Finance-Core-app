import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

interface SummaryCardProps {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  trend?: number;
  color: string;
  onPress?: () => void;
  testID?: string;
}

export function SummaryCard({ label, value, icon, trend, color, onPress, testID }: SummaryCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        flex: 1,
      })}
    >
      <LinearGradient
        colors={[`${color}18`, `${color}08`]}
        style={[styles.card, { borderColor: `${color}25` }]}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Feather name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.value, { color: theme.text, fontFamily: 'Inter_700Bold' }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          {label}
        </Text>
        {trend !== undefined && (
          <View style={styles.trendRow}>
            <Feather
              name={trend >= 0 ? 'trending-up' : 'trending-down'}
              size={12}
              color={trend >= 0 ? '#00C853' : '#FF3D57'}
            />
            <Text style={[styles.trend, { color: trend >= 0 ? '#00C853' : '#FF3D57' }]}>
              {Math.abs(trend).toFixed(1)}%
            </Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  value: { fontSize: 18 },
  label: { fontSize: 12 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  trend: { fontSize: 11, fontFamily: 'Inter_500Medium' },
});
