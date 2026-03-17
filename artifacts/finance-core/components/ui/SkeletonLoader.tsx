import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { theme, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDark ? '#2A2A36' : '#E0E0E8',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={20} width="60%" />
      <Skeleton height={36} width="80%" style={{ marginTop: 8 }} />
      <Skeleton height={14} width="40%" style={{ marginTop: 8 }} />
    </View>
  );
}

export function TransactionSkeleton() {
  return (
    <View style={styles.transaction}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={styles.transactionContent}>
        <Skeleton height={16} width="60%" />
        <Skeleton height={12} width="40%" style={{ marginTop: 6 }} />
      </View>
      <Skeleton height={18} width={80} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 4,
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  transactionContent: {
    flex: 1,
    gap: 4,
  },
});
