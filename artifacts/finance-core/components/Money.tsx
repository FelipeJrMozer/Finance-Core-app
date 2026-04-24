import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatBRL } from '@/utils/formatters';

export type MoneyVariant = 'income' | 'expense' | 'transfer' | 'neutral' | 'auto';
export type MoneyWeight = '400' | '500' | '700';
export type MoneySize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

const SIZE_MAP: Record<MoneySize, number> = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
};

const WEIGHT_FONT: Record<MoneyWeight, string> = {
  '400': 'RobotoMono_400Regular',
  '500': 'RobotoMono_500Medium',
  '700': 'RobotoMono_700Bold',
};

interface MoneyProps {
  /** Valor numérico em reais. */
  value: number;
  /** Renderização compacta (ex.: R$ 1,2K). */
  compact?: boolean;
  /**
   * Cor automática baseada no tipo: income→success, expense→danger,
   * transfer→info, neutral→theme.text, auto→pelo sinal do valor.
   */
  variant?: MoneyVariant;
  /** Sobrescreve a cor calculada pelo `variant`. */
  color?: string;
  weight?: MoneyWeight;
  size?: MoneySize | number;
  /** Mostra "+" quando positivo (útil em variações). */
  signed?: boolean;
  /** Aplica `maskValue()` do ThemeContext (oculta saldos). */
  mask?: boolean;
  style?: StyleProp<TextStyle>;
  testID?: string;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
}

/**
 * Renderiza um valor monetário em BRL usando Roboto Mono com `tabular-nums`,
 * para garantir alinhamento de colunas em listas (transações, investimentos).
 *
 * Centraliza a lógica de formatação + cor por tipo, mantendo paridade visual
 * com o componente `.font-financial` do web.
 */
export function Money({
  value,
  compact = false,
  variant = 'neutral',
  color,
  weight = '500',
  size = 'md',
  signed = false,
  mask = true,
  style,
  testID,
  numberOfLines,
  adjustsFontSizeToFit,
}: MoneyProps) {
  const { theme, colors, maskValue } = useTheme();

  const resolvedColor =
    color ??
    (variant === 'income'
      ? colors.success
      : variant === 'expense'
        ? colors.danger
        : variant === 'transfer'
          ? colors.info
          : variant === 'auto'
            ? value >= 0
              ? colors.success
              : colors.danger
            : theme.text);

  const fontSize = typeof size === 'number' ? size : SIZE_MAP[size];

  const formatted = formatBRL(value, compact);
  const prefix = signed && value > 0 ? '+' : '';
  const display = mask ? maskValue(`${prefix}${formatted}`) : `${prefix}${formatted}`;

  return (
    <Text
      testID={testID}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      style={[
        {
          color: resolvedColor,
          fontSize,
          fontFamily: WEIGHT_FONT[weight],
          fontVariant: ['tabular-nums'],
        },
        style,
      ]}
    >
      {display}
    </Text>
  );
}

export default Money;
