import React from 'react';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

export function WalletIcon({ size = 22, color = '#0096C7' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Wallet body */}
      <Rect x="2" y="6" width="20" height="14" rx="3" stroke={color} strokeWidth="1.8" fill="none" />
      {/* Card slot on top */}
      <Path d="M2 10h20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Coin pocket */}
      <Rect x="14" y="13" width="6" height="4" rx="2" fill={color} />
      {/* Top flap / fold line */}
      <Path d="M6 6V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}
