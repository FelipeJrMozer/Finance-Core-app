import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function MoreSubLayout() {
  const { theme } = useTheme();
  const screenOptions = {
    headerStyle: { backgroundColor: theme.background },
    headerTintColor: theme.text,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.background },
    headerTitleStyle: { fontFamily: 'Inter_600SemiBold' as const },
  };
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="accounts" options={{ title: 'Contas Bancárias' }} />
      <Stack.Screen name="cards" options={{ title: 'Cartões de Crédito' }} />
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
      <Stack.Screen name="recurring" options={{ title: 'Recorrências' }} />
      <Stack.Screen name="sinking-funds" options={{ title: 'Reservas Programadas' }} />
      <Stack.Screen name="pj/index" options={{ title: 'Módulo PJ / MEI' }} />
      <Stack.Screen name="pj/receitas" options={{ title: 'Receitas PJ' }} />
      <Stack.Screen name="pj/despesas" options={{ title: 'Despesas PJ' }} />
      <Stack.Screen name="pj/clientes" options={{ title: 'Clientes' }} />
      <Stack.Screen name="pj/das" options={{ title: 'DAS / Guias' }} />
      <Stack.Screen name="pj/retiradas" options={{ title: 'Pró-labore e Retiradas' }} />
      <Stack.Screen name="pj/notas-fiscais" options={{ title: 'Notas Fiscais' }} />
      <Stack.Screen name="pj/fluxo-caixa" options={{ title: 'Fluxo de Caixa' }} />
      <Stack.Screen name="pj/saude-negocio" options={{ title: 'Saúde do Negócio' }} />
      <Stack.Screen name="pj/dasn-simei" options={{ title: 'DASN-SIMEI' }} />
      <Stack.Screen name="familia" options={{ title: 'Família' }} />
      <Stack.Screen name="lgpd" options={{ title: 'Privacidade e LGPD' }} />
      <Stack.Screen name="sessions" options={{ title: 'Dispositivos e Sessões' }} />
      <Stack.Screen name="legal-terms" options={{ title: 'Termos de Uso' }} />
      <Stack.Screen name="legal-privacy" options={{ title: 'Política de Privacidade' }} />
      <Stack.Screen name="categorization-rules" options={{ title: 'Regras de Categorização' }} />
      <Stack.Screen name="referral" options={{ title: 'Indicação' }} />
      {/* Fase 4 — Imposto de Renda */}
      <Stack.Screen name="taxes" options={{ title: 'Imposto de Renda' }} />
      <Stack.Screen name="darf" options={{ title: 'DARF' }} />
      <Stack.Screen name="tax-calendar" options={{ title: 'Calendário fiscal' }} />
      <Stack.Screen name="irpf-export" options={{ title: 'Exportar IRPF' }} />
      <Stack.Screen name="tax-incomes" options={{ title: 'Rendimentos' }} />
      <Stack.Screen name="tax-deductions" options={{ title: 'Deduções' }} />
    </Stack>
  );
}
