import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
export function MasarSymbol({ size = 42, light = false }: { size?: number; light?: boolean }) {
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityElementsHidden>
    <Path d="M32 3C16 3 6 14 6 28c0 17 26 34 26 34s26-17 26-34C58 14 48 3 32 3Z" fill={light ? '#FFFFFF' : '#087F82'}/>
    <Path d="M18 35V23c0-5 7-5 7 0v10c0 5 7 5 7 0V22c0-5 7-5 7 0v10c0 5 7 5 7 0" stroke={light ? '#087F82' : '#FFFFFF'} strokeWidth="4" strokeLinecap="round" fill="none"/>
    <Circle cx="46" cy="24" r="3" fill="#F3BD64"/>
  </Svg>;
}
export function Brand({ size = 32, light = false, bilingual = false }: { size?: number; light?: boolean; bilingual?: boolean }) {
  return <View accessibilityLabel="Masar مسار" style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><MasarSymbol size={size + 8} light={light}/><Text style={{ fontSize: size, fontWeight: '800', letterSpacing: -1.5, color: light ? '#FFFFFF' : '#0B2538' }}>masar.</Text>{bilingual && <Text style={{ fontSize: size * .7, color: light ? '#FFFFFF' : '#0B2538', fontWeight: '700' }}>مسار</Text>}</View>;
}
