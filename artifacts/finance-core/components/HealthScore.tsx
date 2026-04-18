import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface HealthScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function HealthScore({ score, size = 'md' }: HealthScoreProps) {
  const { theme, colors } = useTheme();
  const animatedWidth = useRef(new Animated.Value(0)).current;

  const maxScore = 100;
  const pct = Math.min(score / maxScore, 1);

  const label =
    score < 30 ? 'Crítico' :
    score < 50 ? 'Baixo' :
    score < 70 ? 'Regular' :
    score < 85 ? 'Bom' :
    'Excelente';

  const barColor =
    score < 30 ? colors.danger :
    score < 50 ? colors.warning :
    score < 70 ? colors.accentWarm :
    colors.primary;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: pct * 100,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  if (size === 'sm') {
    return (
      <View style={styles.smContainer}>
        <View style={styles.smHeader}>
          <Text style={[styles.smLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Saúde Financeira</Text>
          <Text style={[styles.smScore, { color: barColor, fontFamily: 'Inter_700Bold' }]}>{score}</Text>
        </View>
        <View style={[styles.bar, { backgroundColor: theme.surfaceElevated }]}>
          <Animated.View
            style={[
              styles.barFill,
              {
                backgroundColor: barColor,
                width: animatedWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              }
            ]}
          />
        </View>
        <Text style={[styles.smStatus, { color: barColor, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.scoreValue, { color: barColor, fontFamily: 'Inter_700Bold' }]}>{score}</Text>
          <Text style={[styles.scoreLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>/ 100 pontos</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${barColor}20` }]}>
          <Text style={[styles.badgeText, { color: barColor, fontFamily: 'Inter_600SemiBold' }]}>{label}</Text>
        </View>
      </View>
      <View style={[styles.bar, { backgroundColor: theme.surfaceElevated, height: 10 }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: barColor,
              height: 10,
              borderRadius: 5,
              width: animatedWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            }
          ]}
        />
      </View>
      <View style={styles.markers}>
        {[30, 50, 70, 85].map((mark) => (
          <View key={mark} style={[styles.marker, { left: `${(mark / maxScore) * 100}%` as any }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreValue: { fontSize: 36 },
  scoreLabel: { fontSize: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 13 },
  bar: { borderRadius: 5, overflow: 'hidden' },
  barFill: { borderRadius: 5, height: 8 },
  markers: { flexDirection: 'row', position: 'relative', height: 4 },
  marker: { position: 'absolute', width: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  smContainer: { gap: 6 },
  smHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  smLabel: { fontSize: 12 },
  smScore: { fontSize: 14 },
  smStatus: { fontSize: 11 },
});
