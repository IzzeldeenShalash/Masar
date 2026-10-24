import React from 'react';
import { Image, View } from 'react-native';
import welcomeArtwork from '../../../assets/neighborhood-welcome.png';

// A standalone cleaned illustration; no screenshot/UI cropping in the live screen.
export function NeighborhoodArt() {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flex: 1, minHeight: 0, borderRadius: 22, overflow: 'hidden' }}>
    <Image source={welcomeArtwork} accessible={false} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
  </View>;
}
