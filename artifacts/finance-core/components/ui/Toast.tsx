import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, Text, View, StyleSheet, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastProps extends ToastConfig {
  visible: boolean;
  onHide: () => void;
}

const ICONS: Record<ToastType, string> = {
  success: 'check-circle',
  error: 'x-circle',
  info: 'info',
  warning: 'alert-triangle',
};

export function Toast({ message, type = 'info', duration = 3000, visible, onHide }: ToastProps) {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const COLORS: Record<ToastType, string> = {
    success: colors.primary,
    error: colors.danger,
    info: '#3B82F6',
    warning: colors.warning,
  };

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onHide());
  }, [translateY, opacity, onHide]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(hide, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, hide, translateY, opacity]);

  if (!visible) return null;

  const color = COLORS[type];
  const top = Platform.OS === 'ios' ? insets.top + 8 : 12;

  return (
    <Animated.View
      style={[
        s.container,
        {
          top,
          backgroundColor: theme.surface,
          borderColor: `${color}40`,
          shadowColor: color,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable style={s.inner} onPress={hide}>
        <View style={[s.iconBox, { backgroundColor: `${color}20` }]}>
          <Feather name={ICONS[type] as any} size={18} color={color} />
        </View>
        <Text style={[s.message, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={2}>
          {message}
        </Text>
        <Pressable onPress={hide} hitSlop={8}>
          <Feather name="x" size={16} color={theme.textTertiary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export function useToast() {
  const [state, setState] = React.useState<{ visible: boolean; config: ToastConfig }>({
    visible: false,
    config: { message: '' },
  });

  const show = useCallback((config: ToastConfig | string) => {
    const cfg = typeof config === 'string' ? { message: config } : config;
    setState({ visible: true, config: cfg });
  }, []);

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const toastElement = (
    <Toast
      {...state.config}
      visible={state.visible}
      onHide={hide}
    />
  );

  return { show, hide, toastElement };
}
