import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { HeaderActions } from '@/components/HeaderActions';

export default function MoreSubLayout() {
  const { theme } = useTheme();
  const screenOptions = {
    headerStyle: { backgroundColor: theme.background },
    headerTintColor: theme.text,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.background },
    headerTitleStyle: { fontFamily: 'Inter_600SemiBold' as const },
    headerRight: () => <HeaderActions />,
  };
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="accounts" options={{ title: 'Contas e Cartões' }} />
      <Stack.Screen name="goals" options={{ title: 'Metas Financeiras' }} />
      <Stack.Screen name="budgets" options={{ title: 'Orçamentos' }} />
      <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
      <Stack.Screen name="subscriptions" options={{ title: 'Planos e Assinaturas' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notificações' }} />
      <Stack.Screen name="health-score" options={{ title: 'Saúde Financeira' }} />
      <Stack.Screen name="simulators" options={{ title: 'Simuladores' }} />
      <Stack.Screen name="investment-report" options={{ title: 'Relatório de Investimentos' }} />
      <Stack.Screen name="custom-alerts" options={{ title: 'Alertas Personalizados' }} />
      <Stack.Screen name="pending-transactions" options={{ title: 'Lançamentos Pendentes' }} />
      <Stack.Screen name="debts" options={{ title: 'Dívidas' }} />
      <Stack.Screen name="bills" options={{ title: 'Contas a Pagar' }} />
      <Stack.Screen name="sinking-funds" options={{ title: 'Reservas Programadas' }} />
      <Stack.Screen name="pj/index" options={{ title: 'Módulo PJ / MEI' }} />
      <Stack.Screen name="pj/receitas" options={{ title: 'Receitas PJ' }} />
      <Stack.Screen name="pj/despesas" options={{ title: 'Despesas PJ' }} />
      <Stack.Screen name="pj/clientes" options={{ title: 'Clientes' }} />
      <Stack.Screen name="pj/das" options={{ title: 'DAS / Guias' }} />
      <Stack.Screen name="pj/retiradas" options={{ title: 'Pró-labore e Retiradas' }} />
    </Stack>
  );
}
