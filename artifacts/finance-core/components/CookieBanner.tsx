import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

const STORAGE_KEY = 'pf_cookie_consent_v1';

interface ConsentRecord {
  accepted: boolean;
  acceptedAt: string;
  version: number;
}

export function CookieBanner() {
  const { theme, colors } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (!active) return;
        if (!v) setVisible(true);
        else {
          try {
            const parsed: ConsentRecord = JSON.parse(v);
            if (!parsed?.accepted) setVisible(true);
          } catch {
            setVisible(true);
          }
        }
      })
      .catch(() => { if (active) setVisible(true); });
    return () => { active = false; };
  }, []);

  const accept = async () => {
    const rec: ConsentRecord = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      version: 1,
    };
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rec)); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} testID="cookie-banner">
        <View style={styles.row}>
          <Feather name="info" size={16} color={colors.primary} />
          <Text style={[styles.text, { color: theme.text, fontFamily: 'Inter_400Regular' }]}>
            Usamos cookies e dados do dispositivo para personalizar sua experiência.
            Ao continuar você concorda com nossa{' '}
            <Text
              onPress={() => router.push('/(more)/legal-privacy')}
              style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}
            >
              Política de Privacidade
            </Text>.
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push('/(more)/lgpd')}
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
            testID="cookie-prefs"
          >
            <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_500Medium', fontSize: 13 }}>
              Preferências
            </Text>
          </Pressable>
          <Pressable
            onPress={accept}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            testID="cookie-accept"
          >
            <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
              Aceitar
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    zIndex: 9999,
  },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12, elevation: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  text: { flex: 1, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  secondaryBtn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  primaryBtn: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10 },
});
