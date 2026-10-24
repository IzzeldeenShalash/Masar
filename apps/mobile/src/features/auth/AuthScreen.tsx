import React, { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { demoAccounts, loginSchema, signupFormSchema, type SignupFormInput } from '@masar/shared';
import { useAuth } from '../../auth/AuthProvider';
import { ApiError } from '../../api/client';
import { useLocale } from '../../i18n/LocaleProvider';
import { Copy, colors, ErrorNotice } from '../../components/ui';
import { AccountButton, AccountCanvas, AccountTopBar, DemoNotice, accountStyles, useAccountLayout } from './AccountLayout';
import type { TranslationKey } from '../../i18n/strings';

export function errorKey(error: unknown): TranslationKey {
  if (!(error instanceof ApiError)) return 'genericError';
  return ({ INVALID_CREDENTIALS: 'invalidCredentials', SIGNUP_UNAVAILABLE: 'signupUnavailable', RATE_LIMITED: 'rateLimited', NETWORK: 'connectionBody', UNAVAILABLE: 'connectionBody' } as Partial<Record<typeof error.code, TranslationKey>>)[error.code] ?? 'genericError';
}
type FieldName = keyof SignupFormInput;
type FieldSpec = { name: FieldName; label: TranslationKey; validation: TranslationKey; icon: React.ComponentProps<typeof Ionicons>['name']; secret?: boolean };
export function AuthScreen({ signup = false }: { signup?: boolean }) {
  const { t, locale, error: localeError } = useLocale();
  const auth = useAuth();
  const router = useRouter();
  const layout = useAccountLayout();
  const [portal, setPortal] = useState<'USER' | 'AGENCY'>('USER');
  const [visible, setVisible] = useState<Partial<Record<FieldName, boolean>>>({});
  const [focused, setFocused] = useState<FieldName | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [about, setAbout] = useState(false);
  const [step, setStep] = useState(0);
  const refs = useRef<Partial<Record<FieldName, React.ComponentRef<typeof TextInput> | null>>>({});
  const form = useForm<SignupFormInput>({
    resolver: zodResolver(signup ? signupFormSchema : loginSchema.extend({ displayName: z.string(), confirmPassword: z.string() })),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' }, mode: 'onTouched',
  });
  const busy = form.formState.isSubmitting;
  const rtl = locale === 'ar';
  const agency = !signup && portal === 'AGENCY';
  // Very small available areas (keyboard / enlarged text) use two short form steps.
  // Values remain in React Hook Form; nothing is persisted as a draft.
  const paged = signup && layout.available / layout.fontScale < 430;
  const focusMode = layout.keyboard || layout.available < 500 || layout.available / layout.fontScale < 430;
  const hideHeader = focusMode;
  const compact = layout.dense || focusMode;
  const fields: FieldSpec[] = [
    ...(signup ? [{ name: 'displayName' as const, label: 'displayName' as const, validation: 'invalidName' as const, icon: 'person-outline' as const }] : []),
    { name: 'email', label: 'email', validation: 'invalidEmail', icon: 'mail-outline' },
    { name: 'password', label: 'password', validation: signup ? 'invalidPassword' : 'requiredPassword', icon: 'lock-closed-outline', secret: true },
    ...(signup ? [{ name: 'confirmPassword' as const, label: 'confirmPassword' as const, validation: 'mismatch' as const, icon: 'lock-closed-outline' as const, secret: true }] : []),
  ];
  const shownFields = paged ? fields.slice(step === 0 ? 0 : 2, step === 0 ? 2 : 4) : fields;
  const submit = form.handleSubmit(async (values) => {
    setError(null); Keyboard.dismiss();
    try {
      if (signup) await auth.signup({ displayName: values.displayName, email: values.email, password: values.password });
      else await auth.login({ email: values.email, password: values.password });
      form.reset();
    } catch (cause) { setError(errorKey(cause)); form.setValue('password', ''); form.setValue('confirmPassword', ''); }
  });
  async function nextStep() {
    if (!await form.trigger(['displayName', 'email'], { shouldFocus: true })) return;
    setStep(1);
    requestAnimationFrame(() => refs.current.password?.focus());
  }
  function back() {
    if (paged && step === 1) { setStep(0); return; }
    router.replace(signup ? '/login' : '/');
  }
  function useDemo() {
    form.setValue('email', agency ? demoAccounts.agency : demoAccounts.user, { shouldValidate: true });
    form.setValue('password', demoAccounts.password, { shouldValidate: true });
    setError(null); Keyboard.dismiss();
  }
  const primary = () => { if (paged && step === 0) void nextStep(); else void submit(); };
  return <AccountCanvas style={{ paddingTop: focusMode ? 0 : 8, paddingBottom: focusMode ? 6 : 12 }}>
    <AccountTopBar onBack={back} disabled={busy}/>
    <View style={{ flex: 1, minHeight: 0 }}>
      {!hideHeader && <View style={{ gap: 5, marginTop: layout.tight ? 5 : 12 }}>
        <Copy accessibilityRole="header" style={[accountStyles.heading, { fontSize: layout.tiny ? 25 : 29, lineHeight: layout.tiny ? 30 : 35 }]}>{t(signup ? layout.tiny ? 'signup' : 'signupHeadline' : 'welcome')}</Copy>
        {!(signup && layout.tight) && !layout.tiny && !focusMode && <Copy style={accountStyles.subtitle}>{t(signup ? 'signupDescription' : agency ? 'agencySubtitle' : 'loginSubtitle')}</Copy>}
        {paged && <Copy style={{ fontSize: 12, color: colors.muted }}>{t('accountStep')} {step + 1}/2</Copy>}
      </View>}
      {!signup && !focusMode && <View accessibilityRole="tablist" style={[s.tabs, { marginTop: layout.tiny ? 12 : layout.tight ? 16 : 22, flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        {(['USER', 'AGENCY'] as const).map((role) => <Pressable key={role} accessibilityRole="tab" accessibilityState={{ selected: portal === role, disabled: busy }} disabled={busy} onPress={() => { setPortal(role); setError(null); }} style={{ flex: 1, borderRadius: 17, overflow: 'hidden' }}>
          <View style={{ minHeight: 46, borderRadius: 17, backgroundColor: portal === role ? colors.teal : 'transparent', flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 8 }}>
            <Ionicons accessible={false} aria-hidden name={role === 'USER' ? portal === role ? 'person' : 'person-outline' : 'business-outline'} size={22} color={portal === role ? '#fff' : '#34566A'} />
            <Copy style={{ color: portal === role ? '#fff' : colors.ink, fontSize: 14, fontWeight: '600', lineHeight: 21 }}>{t(role === 'USER' ? 'user' : 'agency')}</Copy>
          </View>
        </Pressable>)}
      </View>}
      {agency && !focusMode && <View style={[s.invitation, { padding: layout.tiny ? 10 : 12, marginTop: layout.tight ? 10 : 14, flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <Ionicons accessible={false} aria-hidden name="alert-circle" size={25} color="#CB8400" />
        <View style={{ flex: 1, gap: 3 }}><Copy style={{ fontSize: 13, fontWeight: '700', lineHeight: 19 }}>{t('agencyInvitation')}</Copy>{!layout.tiny && <Copy style={{ fontSize: 12, lineHeight: 17, color: '#6A542D' }}>{t('agencyInvitationBody')}</Copy>}</View>
      </View>}
      {auth.expired && <Copy accessibilityLiveRegion="polite" style={{ color: colors.amber, fontSize: 12, lineHeight: 17, marginTop: 6 }}>{t('expired')}</Copy>}
      {error && <View style={{ marginTop: 8 }}><ErrorNotice text={t(error)} /></View>}
      {localeError && <Copy accessibilityRole="alert" style={{ color: colors.red, fontSize: 12, lineHeight: 17 }}>{t('languageError')}</Copy>}
      <View style={{ gap: focusMode ? 7 : layout.tiny ? 10 : compact ? 13 : 20, marginTop: hideHeader ? 8 : layout.tiny ? 12 : compact ? 16 : 23 }}>
        {shownFields.map(({ name, label, validation, icon, secret }, index) => <Controller key={name} control={form.control} name={name} render={({ field: { onChange, onBlur, value, ref }, fieldState }) => <View style={{ gap: focusMode ? 4 : 6 }}>
          <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <Copy nativeID={name + '-label'} style={{ fontWeight: '600', fontSize: 14, lineHeight: 19 }}>{t(label)}</Copy>
            {fieldState.error && <Copy accessibilityLiveRegion="polite" style={{ color: colors.red, fontSize: 11, lineHeight: 16, flex: 1, textAlign: rtl ? 'left' : 'right' }}>{t(validation)}</Copy>}
          </View>
          <View style={[s.inputBox, { minHeight: focusMode ? 44 : compact ? 48 : 52, flexDirection: rtl && name === 'displayName' ? 'row-reverse' : 'row', borderColor: fieldState.invalid ? colors.red : focused === name ? colors.teal : '#D5DFE3' }]}>
            <Ionicons accessible={false} aria-hidden name={icon} size={21} color={name === 'email' ? colors.teal : '#3C5D71'} />
            <TextInput ref={(instance) => { ref(instance); refs.current[name] = instance; }} accessibilityLabel={t(label)} accessibilityLabelledBy={name + '-label'} accessibilityHint={fieldState.invalid ? t(validation) : undefined} aria-invalid={fieldState.invalid} editable={!busy}
              value={value} onChangeText={onChange} onBlur={() => { onBlur(); setFocused(null); }} onFocus={() => { setFocused(name); if (signup) setStep(name === 'password' || name === 'confirmPassword' ? 1 : 0); }}
              secureTextEntry={secret && !visible[name]} autoCapitalize="none" autoCorrect={false} maxLength={name === 'email' ? 254 : name === 'displayName' ? 80 : 128}
              autoComplete={name === 'email' ? 'email' : name === 'displayName' ? 'name' : signup ? 'new-password' : 'current-password'}
              keyboardType={name === 'email' ? 'email-address' : 'default'}
              placeholder={secret ? '' : name === 'displayName' ? t('namePlaceholder') : 'you@example.com'} placeholderTextColor="#84979F"
              style={{ flex: 1, minWidth: 0, paddingVertical: 10, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: name === 'displayName' && rtl ? 'right' : 'left', writingDirection: name === 'displayName' && rtl ? 'rtl' : 'ltr', outlineWidth: 0 }}
              returnKeyType={index === shownFields.length - 1 ? paged && step === 0 ? 'next' : 'go' : 'next'}
              onSubmitEditing={() => { const next = shownFields[index + 1]; if (next) refs.current[next.name]?.focus(); else primary(); }} />
            {secret && <Pressable accessibilityRole="button" accessibilityLabel={t(visible[name] ? 'hide' : 'show') + ' ' + t(label)} accessibilityState={{ expanded: !!visible[name] }} onPress={() => setVisible((current) => ({ ...current, [name]: !current[name] }))} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons accessible={false} aria-hidden name={visible[name] ? 'eye-off-outline' : 'eye-outline'} size={21} color="#3C5D71" /></Pressable>}
          </View>
          {name === 'password' && signup && !focusMode && <Copy style={{ fontSize: 12, lineHeight: 17, color: '#617F90' }}>{t('passwordHint')}</Copy>}
        </View>} />)}
      </View>
      <View style={{ marginTop: focusMode ? 12 : layout.tiny ? 13 : compact ? 17 : 23 }}><AccountButton title={t(busy ? 'pending' : paged && step === 0 ? 'continue' : signup ? 'signup' : 'login')} compact={compact} pending={busy} onPress={primary} /></View>
      {!focusMode && !layout.tiny && <View style={s.divider}><View style={s.rule} /><Copy style={{ fontSize: 13 }}>{t('or')}</Copy><View style={s.rule} /></View>}
      {!focusMode && !(signup && layout.tiny) && (signup || !agency) && <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: layout.tiny ? 10 : 0 }}>
        <Copy style={{ fontSize: 14, lineHeight: 21 }}>{t(signup ? 'haveAccount' : 'noAccount')}</Copy>
        <Pressable accessibilityRole="link" disabled={busy} onPress={() => router.replace(signup ? '/login' : '/signup')} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 }}><Copy style={{ color: colors.teal, fontWeight: '700', fontSize: 14, lineHeight: 21 }}>{t(signup ? 'login' : 'signup')}</Copy></Pressable>
      </View>}
      <View style={{ flex: 1, minHeight: focusMode ? 0 : 10 }} />
      {!signup && !focusMode && auth.demoMode && <Pressable accessibilityRole="button" accessibilityLabel={t('useDemoAccount')} disabled={busy} onPress={useDemo} style={[s.demoPanel, agency && { backgroundColor: '#FCFDFC', borderWidth: 1, borderColor: '#DCE5E5' }, { padding: layout.tiny ? 10 : 14, flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <Ionicons accessible={false} aria-hidden name={agency ? 'people-outline' : 'information-circle-outline'} size={25} color={colors.teal} />
        <View style={{ flex: 1, gap: 3 }}>
          <Copy style={{ fontSize: 13, lineHeight: 19, fontWeight: '700' }}>{t(agency ? 'demoAccounts' : 'demoAccount')}</Copy>
          {!layout.tiny && <Copy style={{ fontSize: 12, lineHeight: 17, color: '#52717F' }}>{t(agency ? 'agencyDemoDescription' : 'userDemoDescription')}</Copy>}
          <Copy selectable style={{ fontSize: 12, lineHeight: 18, color: colors.teal, fontWeight: '600', textAlign: 'left', writingDirection: 'ltr' }}>{agency ? demoAccounts.agency : demoAccounts.user}</Copy>
        </View>
        <Ionicons accessible={false} aria-hidden name="arrow-up-circle-outline" size={20} color="#476A7A" />
      </Pressable>}
      {!focusMode && !signup && !layout.tiny && <Pressable accessibilityRole="button" accessibilityLabel={t('about')} onPress={() => setAbout(true)} style={{ minHeight: 32, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ fontSize: 10, lineHeight: 15, color: '#5F797E', textAlign: 'center' }}>{t('shortDemoNotice')}</Copy></Pressable>}
    </View>
    <DemoNotice open={about} close={() => setAbout(false)} />
  </AccountCanvas>;
}
const s = StyleSheet.create({
  tabs: { borderWidth: 1, borderColor: '#D3DFE2', borderRadius: 20, padding: 3, backgroundColor: '#F2F5F4', gap: 3 },
  inputBox: { borderWidth: 1, borderRadius: 11, backgroundColor: '#FDFEFC', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  invitation: { padding: 12, backgroundColor: '#FFF0D0', borderRadius: 14, gap: 10, alignItems: 'flex-start' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 35, marginTop: 9 },
  rule: { flex: 1, height: 1, backgroundColor: '#D1DDE2' },
  demoPanel: { backgroundColor: '#E8F4F0', borderRadius: 15, gap: 12, alignItems: 'flex-start' },
});
