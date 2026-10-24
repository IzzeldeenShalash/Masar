import {focusStyle} from '../../accessibility/hooks';
import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, ScrollView, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocale } from '../../i18n/LocaleProvider';
import { Copy, colors } from '../../components/ui';

export function useAccountLayout() {
  const { height, width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const available = height - insets.top - insets.bottom - (Platform.OS === 'ios' ? keyboardHeight : 0);
  return { available, width, fontScale, keyboard: keyboardHeight > 0, dense: available < 780, tight: available < 700, tiny: available < 620 };
}
export function AccountCanvas({ children, style }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const layout=useAccountLayout();const flexible=layout.fontScale>1.3||layout.available<400;
  const content=<View testID="account-viewport" style={[accountStyles.canvas,{direction:'ltr'},flexible&&{flex:undefined},style]}>{children}</View>;
  return <SafeAreaView style={accountStyles.screen}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView scrollEnabled={flexible} keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1}}>{content}</ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function LanguageSwitch({ pill = false }: { pill?: boolean }) {
  const { t, locale, toggle } = useLocale();const [focused,setFocused]=useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={locale === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onPress={() => void toggle()} style={[accountStyles.language,focusStyle(focused), pill && accountStyles.languagePill]}>
    <Ionicons accessible={false} aria-hidden name="globe-outline" size={18} color={colors.teal} />
    {pill ? <><Text style={[accountStyles.languageText, locale === 'en' && { color: colors.teal, fontWeight: '700' }]}>English</Text><View style={{ height: 18, width: 1, backgroundColor: colors.border }} /><Text style={[accountStyles.languageText, locale === 'ar' && { color: colors.teal, fontWeight: '700' }]}>العربية</Text></> : <Text style={accountStyles.languageText}>{t('language')}</Text>}
  </Pressable>;
}
export function AccountTopBar({ onBack,disabled=false }: { onBack: () => void;disabled?:boolean }) {
  const { locale, t } = useLocale();
  return <View style={{ flexDirection: locale === 'ar' ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('back')} disabled={disabled} accessibilityState={{disabled}} onPress={() => { Keyboard.dismiss(); onBack(); }} style={accountStyles.back}><Ionicons accessible={false} aria-hidden name={locale === 'ar' ? 'arrow-forward' : 'arrow-back'} size={23} color={colors.ink} /></Pressable>
    <LanguageSwitch />
  </View>;
}
export function AccountButton({ title, onPress, secondary, pending, disabled, compact }: { title: string; onPress: () => void; secondary?: boolean; pending?: boolean; disabled?: boolean; compact?: boolean }) {
  const { locale } = useLocale();const [focused,setFocused]=useState(false);
  return <Pressable onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || pending, busy: pending }} disabled={disabled || pending} onPress={onPress} style={({ pressed }) => [focusStyle(focused),{ borderRadius: 19, opacity: disabled || pending ? 0.65 : pressed ? 0.85 : 1 }, secondary && { borderWidth: 1, borderColor: '#CCD8DE' }]}>
    <LinearGradient colors={secondary ? ['#FCFDFC', '#FAFCFA'] : ['#087F82', '#007D82']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: compact ? 48 : 55, paddingHorizontal: 20, paddingVertical: 11, flexDirection: locale === 'ar' ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 18 }}>
      <Text style={{ flex: 1, textAlign: 'center', color: secondary ? colors.ink : '#fff', fontSize: 17, lineHeight: 23, fontWeight: '600' }}>{title}</Text>
      {!secondary && <Ionicons accessible={false} aria-hidden name={pending ? 'ellipsis-horizontal' : locale === 'ar' ? 'arrow-back' : 'arrow-forward'} size={22} color="#fff" />}
    </LinearGradient>
  </Pressable>;
}
export function DemoNotice({ open, close }: { open: boolean; close: () => void }) {
  const { t } = useLocale();
  if(!open)return null;
  return <Modal visible={open} transparent animationType="none" onRequestClose={close}>
    <View style={accountStyles.modalBackdrop}><View accessibilityViewIsModal style={accountStyles.modalCard}>
      <Copy accessibilityRole="header" style={accountStyles.heading}>{t('about')}</Copy>
      <Copy>{t('aboutBody')}</Copy>
      <AccountButton title={t('close')} onPress={close} compact />
    </View></View>
  </Modal>;
}
export const accountStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFCFA' },
  canvas: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, minHeight: 0 },
  heading: { fontSize: 29, lineHeight: 35, letterSpacing: -0.7, fontWeight: '700' },
  subtitle: { fontSize: 16, lineHeight: 23, color: '#476171' },
  language: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, paddingHorizontal: 8 },
  languagePill: { borderWidth: 1, borderColor: '#D7E1E3', borderRadius: 28, alignSelf: 'center', paddingHorizontal: 16, gap: 13, backgroundColor: '#FDFEFC' },
  languageText: { color: '#45616F', fontSize: 13, lineHeight: 20 },
  back: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(7,29,42,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 400, backgroundColor: '#FAFCFA', padding: 24, borderRadius: 22, gap: 20 },
});
