import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

const CATEGORIES: Record<string, { label: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  food: { label: 'Alimentação', icon: 'coffee', color: Colors.categories.food },
  transport: { label: 'Transporte', icon: 'map-pin', color: Colors.categories.transport },
  housing: { label: 'Moradia', icon: 'home', color: Colors.categories.housing },
  health: { label: 'Saúde', icon: 'heart', color: Colors.categories.health },
  entertainment: { label: 'Lazer', icon: 'film', color: Colors.categories.entertainment },
  education: { label: 'Educação', icon: 'book', color: Colors.categories.education },
  clothing: { label: 'Compras', icon: 'shopping-bag', color: Colors.categories.clothing },
  investment: { label: 'Investimento', icon: 'trending-up', color: Colors.categories.investment },
  income: { label: 'Renda', icon: 'dollar-sign', color: Colors.categories.income },
  other: { label: 'Outros', icon: 'more-horizontal', color: Colors.categories.other },
};

export function getCategoryInfo(category: string) {
  return CATEGORIES[category] || CATEGORIES.other;
}

interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function CategoryBadge({ category, size = 'md', showLabel = false }: CategoryBadgeProps) {
  const info = getCategoryInfo(category);
  const iconSize = size === 'sm' ? 14 : 18;
  const containerSize = size === 'sm' ? 32 : 44;

  return (
    <View style={styles.row}>
      <View style={[
        styles.badge,
        {
          backgroundColor: `${info.color}20`,
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
        }
      ]}>
        <Feather name={info.icon} size={iconSize} color={info.color} />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: info.color }]}>{info.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});

export { CATEGORIES };
