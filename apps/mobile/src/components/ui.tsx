import {readableText} from '../i18n/format';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type TextProps } from 'react-native';
import { useLocale } from '../i18n/LocaleProvider';

export const colors = { background: '#FAFCFA', ink: '#0B2538', teal: '#087F82', red: '#B42318', amber: '#A85B00', muted: '#52646B', border: '#DFE5E1', pale: '#E6F1EE' };
export function Copy({ style, children, ...props }: TextProps) {
  const { locale } = useLocale();
  return <Text {...props} style={[s.copy, { textAlign: locale === 'ar' ? 'right' : 'left', writingDirection: locale === 'ar' ? 'rtl' : 'ltr' }, style]}>{typeof children==='string'?readableText(children,locale):children}</Text>;
}
export function ErrorNotice({ text }: { text: string }) {
  return <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.error}><Copy style={{ color: colors.red, fontSize: 13, lineHeight: 19 }}>{text}</Copy></View>;
}
export function Disclosure({ title, children }: React.PropsWithChildren<{ title: string }>) {
  const [open, setOpen] = React.useState(false);
  return <View style={s.disclosure}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 48, justifyContent: 'center' }}><Copy style={{ fontWeight: '600', color: colors.teal }}>{open ? '−' : '+'}  {title}</Copy></Pressable>
    {open && <View style={{ paddingBottom: 16, gap: 8 }}>{children}</View>}
  </View>;
}
const s = StyleSheet.create({
  copy: { fontSize: 16, lineHeight: 25, color: colors.ink, flexShrink: 1 },
  error: { backgroundColor: '#FEF1EF', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F0C5BE' },
  disclosure: { borderTopWidth: 1, borderColor: colors.border },
});
