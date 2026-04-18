import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { useTheme } from '@/context/ThemeContext';

export function OfflineBanner() {
  const { theme, colors } = useTheme();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function check() {
      try {
        const state = await Network.getNetworkStateAsync();
        const isUp = (state.isConnected ?? true) && (state.isInternetReachable ?? true);
        if (mounted) setOnline(isUp);
      } catch {
        // ignore
      }
    }
    check();
    interval = setInterval(check, 8000);
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  if (online) return null;

  return (
    <View style={[styles.banner, { backgroundColor: `${colors.warning}20`, borderColor: colors.warning }]}>
      <Feather name="wifi-off" size={13} color={colors.warning} />
      <Text style={[styles.text, { color: colors.warning, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
        Sem conexão — exibindo dados em cache
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
  },
  text: { fontSize: 12, flex: 1 },
});
