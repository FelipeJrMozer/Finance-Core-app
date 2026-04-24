import React from 'react';
import {
  Pressable as RNPressable,
  PressableProps as RNPressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

export type HapticIntensity = 'light' | 'medium' | 'heavy' | 'selection' | 'none';

export interface PressableBaseProps extends Omit<RNPressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Intensidade do feedback tátil ao tocar (default: 'none'). */
  haptic?: HapticIntensity;
}

function triggerHaptic(intensity: HapticIntensity) {
  if (intensity === 'none') return;
  if (intensity === 'selection') {
    Haptics.selectionAsync();
    return;
  }
  const map = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    heavy: Haptics.ImpactFeedbackStyle.Heavy,
  } as const;
  Haptics.impactAsync(map[intensity]);
}

export interface PressableScaleProps extends PressableBaseProps {
  /** Escala aplicada no estado pressionado (default 0.96 — equiv. `.button-press` do web). */
  scale?: number;
  /** Opacidade aplicada no press (default 0.92). */
  pressedOpacity?: number;
}

/**
 * Botão/CTA: aplica `scale` no press para feedback tátil visual.
 * Equivalente ao `.button-press` (scale: 0.95) do web.
 */
export function PressableScale({
  style,
  scale = 0.96,
  pressedOpacity = 0.92,
  haptic = 'none',
  onPress,
  ...rest
}: PressableScaleProps) {
  return (
    <RNPressable
      {...rest}
      onPress={(e) => {
        triggerHaptic(haptic);
        onPress?.(e);
      }}
      style={({ pressed }) => [
        { transform: [{ scale: pressed ? scale : 1 }], opacity: pressed ? pressedOpacity : 1 },
        typeof style === 'function' ? style({ pressed, hovered: false }) : style,
      ]}
    />
  );
}

export interface PressableElevateProps extends PressableBaseProps {
  /** Cor de fundo no estado pressionado (default: theme.surfaceElevated). */
  elevatedColor?: string;
  /** Raio interno do efeito (deve casar com o do filho). */
  borderRadius?: number;
}

/**
 * Item de lista clicável: ao pressionar, troca o background para
 * `surfaceElevated`. Equivalente ao `.hover-elevate` do web.
 */
export function PressableElevate({
  style,
  elevatedColor,
  borderRadius,
  haptic = 'selection',
  onPress,
  ...rest
}: PressableElevateProps) {
  const { theme } = useTheme();
  const elev = elevatedColor ?? theme.surfaceElevated;
  return (
    <RNPressable
      {...rest}
      onPress={(e) => {
        triggerHaptic(haptic);
        onPress?.(e);
      }}
      style={({ pressed }) => [
        pressed ? { backgroundColor: elev, borderRadius } : null,
        typeof style === 'function' ? style({ pressed, hovered: false }) : style,
      ]}
    />
  );
}

/**
 * Combinação: scale + elevate. Usado em cards de estatística no dashboard
 * (equiv. `.card-hover-lift` + `.button-press` do web).
 */
export interface PressableScaleElevateProps extends PressableScaleProps, PressableElevateProps {}

export function PressableScaleElevate({
  style,
  scale = 0.97,
  pressedOpacity = 0.95,
  elevatedColor,
  borderRadius,
  haptic = 'light',
  onPress,
  ...rest
}: PressableScaleElevateProps) {
  const { theme } = useTheme();
  const elev = elevatedColor ?? theme.surfaceElevated;
  return (
    <RNPressable
      {...rest}
      onPress={(e) => {
        triggerHaptic(haptic);
        onPress?.(e);
      }}
      style={({ pressed }) => [
        {
          transform: [{ scale: pressed ? scale : 1 }],
          opacity: pressed ? pressedOpacity : 1,
        },
        pressed ? { backgroundColor: elev, borderRadius } : null,
        typeof style === 'function' ? style({ pressed, hovered: false }) : style,
      ]}
    />
  );
}

export default PressableScale;
