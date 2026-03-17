import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function MoreSubLayout() {
  const { theme } = useTheme();
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: theme.background },
      headerTintColor: theme.text,
      headerShadowVisible: false,
      contentStyle: { backgroundColor: theme.background },
      headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
    }}>
      <Stack.Screen name="accounts" options={{ title: 'Contas e Cartões' }} />
      <Stack.Screen name="goals" options={{ title: 'Metas Financeiras' }} />
      <Stack.Screen name="darfs" options={{ title: 'DARFs e IR' }} />
      <Stack.Screen name="ir" options={{ title: 'Imposto de Renda' }} />
      <Stack.Screen name="budgets" options={{ title: 'Orçamentos' }} />
      <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
      <Stack.Screen name="family" options={{ title: 'Módulo Familiar' }} />
    </Stack>
  );
}
