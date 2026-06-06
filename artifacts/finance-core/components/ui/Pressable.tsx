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

type StyleFn = (state: { pressed: boolean }) => StyleProp<ViewStyle>;
type PressableStyle = StyleProp<ViewStyle> | StyleFn;

export interface PressableBaseProps extends Omit<RNPressableProps, 'style'> {
  style?: PressableStyle;
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

function resolveStyle(style: PressableStyle | undefined, pressed: boolean): StyleProp<ViewStyle> {
  if (typeof style === 'function') return (style as StyleFn)({ pressed });
  return style;
}

export interface PressableScaleProps extends PressableBaseProps {
  scale?: number;
  pressedOpacity?: number;
}

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
        resolveStyle(style, pressed),
      ]}
    />
  );
}

export interface PressableElevateProps extends PressableBaseProps {
  elevatedColor?: string;
  borderRadius?: number;
}

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
        resolveStyle(style, pressed),
      ]}
    />
  );
}

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
        resolveStyle(style, pressed),
      ]}
    />
  );
}

export default PressableScale;
