import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { FeatureGate } from '@/components/FeatureGate';

export default function PJLayout() {
  const { theme } = useTheme();
  const screenOptions = {
    headerStyle: { backgroundColor: theme.background },
    headerTintColor: theme.text,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.background },
    headerTitleStyle: { fontFamily: 'Inter_600SemiBold' as const },
    headerBackTitle: 'Voltar',
  };

  return (
    <FeatureGate
      feature="pj"
      title="Módulo PJ / MEI"
      icon="briefcase"
      description="Gestão completa para autônomos e MEI: receitas, despesas, DAS, notas fiscais e saúde do negócio. Disponível nos planos PJ e Family."
    >
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ title: 'Módulo PJ / MEI' }} />
        <Stack.Screen name="receitas" options={{ title: 'Receitas PJ' }} />
        <Stack.Screen name="despesas" options={{ title: 'Despesas PJ' }} />
        <Stack.Screen name="clientes" options={{ title: 'Clientes' }} />
        <Stack.Screen name="das" options={{ title: 'DAS / Guias' }} />
        <Stack.Screen name="retiradas" options={{ title: 'Pró-labore e Retiradas' }} />
        <Stack.Screen name="notas-fiscais" options={{ title: 'Notas Fiscais' }} />
        <Stack.Screen name="fluxo-caixa" options={{ title: 'Fluxo de Caixa' }} />
        <Stack.Screen name="saude-negocio" options={{ title: 'Saúde do Negócio' }} />
        <Stack.Screen name="dasn-simei" options={{ title: 'DASN-SIMEI' }} />
      </Stack>
    </FeatureGate>
  );
}
