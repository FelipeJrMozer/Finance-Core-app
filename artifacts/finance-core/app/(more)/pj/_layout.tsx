import React from 'react';
import { Stack } from 'expo-router';
import { FeatureGate } from '@/components/FeatureGate';

export default function PJLayout() {
  return (
    <FeatureGate
      feature="pj"
      title="Módulo PJ / MEI"
      icon="briefcase"
      description="Gestão completa para autônomos e MEI: receitas, despesas, DAS, notas fiscais e saúde do negócio. Disponível nos planos PJ e Family."
    >
      <Stack screenOptions={{ headerShown: false }} />
    </FeatureGate>
  );
}
