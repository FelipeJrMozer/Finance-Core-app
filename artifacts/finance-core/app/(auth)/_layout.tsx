import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function AuthLayout() {
  const { theme } = useTheme();
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: theme.background },
      headerTintColor: theme.text,
      headerShadowVisible: false,
      contentStyle: { backgroundColor: theme.background },
    }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Criar Conta' }} />
    </Stack>
  );
}
