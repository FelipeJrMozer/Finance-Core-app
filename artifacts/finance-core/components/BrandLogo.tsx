import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';

interface BrandLogoProps {
  size?: number;
  /** Mostra o nome "Pilar Financeiro" ao lado/abaixo do diamante. */
  showWordmark?: boolean;
  /** Layout: linha (logo + wordmark lado a lado) ou coluna (logo em cima). */
  direction?: 'row' | 'column';
  /** Cor do diamante. Por padrão usa `colors.primary`. */
  color?: string;
  /** Cor da escrita. Por padrão usa `theme.text`. */
  textColor?: string;
  /** Tamanho da fonte do wordmark (default: size * 0.45). */
  wordmarkSize?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * Logo da marca Pilar Financeiro — diamante (placeholder vetorial alinhado
 * com o web) + wordmark "Pilar" 700 + "Financeiro" 300. O asset oficial
 * `logo-diamond.png` pode substituir o SVG no futuro mantendo a mesma API.
 */
export function BrandLogo({
  size = 48,
  showWordmark = true,
  direction = 'row',
  color,
  textColor,
  wordmarkSize,
  style,
  textStyle,
  testID,
}: BrandLogoProps) {
  const { colors, theme } = useTheme();
  const fill = color ?? colors.primary;
  const txt = textColor ?? theme.text;
  const fontSize = wordmarkSize ?? Math.round(size * 0.45);

  return (
    <View
      testID={testID}
      style={[
        direction === 'row' ? styles.row : styles.col,
        { gap: direction === 'row' ? 10 : 6, alignItems: 'center' },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Defs>
          <SvgLinearGradient id="diamondGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={fill} stopOpacity={1} />
            <Stop offset="1" stopColor={fill} stopOpacity={0.7} />
          </SvgLinearGradient>
        </Defs>
        {/* Diamante: contorno superior + losango interno */}
        <Path
          d="M32 4 L60 24 L32 60 L4 24 Z"
          fill="url(#diamondGrad)"
        />
        <Path
          d="M32 4 L20 24 L32 60 L44 24 Z"
          fill={fill}
          opacity={0.85}
        />
        <Path
          d="M4 24 L60 24"
          stroke="#FFFFFF"
          strokeOpacity={0.35}
          strokeWidth={1.5}
        />
      </Svg>
      {showWordmark && (
        <Text
          allowFontScaling={false}
          style={[
            {
              color: txt,
              fontFamily: 'Inter_700Bold',
              fontSize,
              letterSpacing: -0.3,
            },
            textStyle,
          ]}
          testID={testID ? `${testID}-wordmark` : undefined}
        >
          Pilar
          <Text style={{ fontFamily: 'Inter_300Light', color: txt }}>
            {' '}Financeiro
          </Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  col: { flexDirection: 'column' },
});

export default BrandLogo;
