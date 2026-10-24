import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Copy, colors } from '../../components/ui';
import { Brand } from '../../components/Brand';
import { useLocale } from '../../i18n/LocaleProvider';

export function AnimatedSplash({ onComplete }: { onComplete: () => void }) {
  const { t } = useLocale();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const path = useRef(new Animated.Value(0)).current;
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    let disposed = false;
    let animation: Animated.CompositeAnimation | undefined;
    const finish = () => { if (!disposed) complete.current(); };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => { if (reduced) { animation?.stop(); finish(); } });
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => true).then((reduced) => {
      if (disposed) return;
      if (reduced) { finish(); return; }
      animation = Animated.sequence([
        Animated.parallel([
          Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(path, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]);
      animation.start(({ finished }) => { if (finished) finish(); });
    });
    return () => { disposed = true; animation?.stop(); subscription.remove(); };
  }, [fade, scale, path]);
  return <SafeAreaView style={s.screen}><Animated.View style={{ alignItems: 'center', opacity: fade, transform: [{ scale }], padding: 28, gap: 18 }}>
    <Brand size={52} bilingual/>
    <Copy style={{ fontSize: 18, color: '#4C6974', textAlign: 'center' }}>{t('tagline')}</Copy>
    <View style={s.track}><Animated.View style={[s.path, { transform: [{ scaleX: path }] }]} /><View style={[s.dot, { left: 0 }]} /><View style={[s.dot, { right: 0 }]} /></View>
    <Copy style={{ fontSize: 12, color: '#71858B', textAlign: 'center' }}>{t('splashCaption')}</Copy>
  </Animated.View></SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFCFA', alignItems: 'center', justifyContent: 'center' },
  mark: { fontSize: 70, lineHeight: 82, fontWeight: '800', letterSpacing: -4, color: colors.ink },
  track: { width: 152, height: 20, marginTop: 12, justifyContent: 'center' },
  path: { height: 3, width: '100%', backgroundColor: colors.teal },
  dot: { width: 12, height: 12, borderRadius: 6, position: 'absolute', top: 4, backgroundColor: colors.teal, borderWidth: 3, borderColor: '#D5EDE7' },
});
