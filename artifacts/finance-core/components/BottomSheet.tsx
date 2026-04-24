import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, Modal, Pressable, Animated, Dimensions,
  KeyboardAvoidingView, Platform, ScrollView, Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** maxHeight as fraction of window height. Default 0.85 */
  maxHeightRatio?: number;
  /** Optional sticky footer (e.g. botões Limpar / Aplicar) */
  footer?: React.ReactNode;
  testID?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Lightweight BottomSheet — sem dependência nova.
 * Slide-up + backdrop tappable + suporte a body scrollable e footer fixo.
 */
export function BottomSheet({
  visible, onClose, title, children, maxHeightRatio = 0.85, footer, testID,
}: BottomSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  const sheetMaxHeight = SCREEN_HEIGHT * maxHeightRatio;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill} testID={testID}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', opacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} testID="bottomsheet-backdrop" />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kbWrap}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.surface,
                maxHeight: sheetMaxHeight,
                paddingBottom: Math.max(insets.bottom, 12),
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={styles.handle}>
              <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
            </View>

            {title && (
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  testID="bottomsheet-close"
                  style={[styles.closeBtn, { backgroundColor: theme.surfaceElevated }]}
                >
                  <Feather name="x" size={16} color={theme.textSecondary} />
                </Pressable>
              </View>
            )}

            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            {footer && (
              <View style={[styles.footer, { borderTopColor: theme.border }]}>
                {footer}
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kbWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 6,
  },
  handle: { alignItems: 'center', paddingVertical: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1,
  },
  title: { fontSize: 17 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, gap: 14 },
  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
    borderTopWidth: 1, flexDirection: 'row', gap: 10,
  },
});
