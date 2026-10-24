import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { Brand } from '../../components/Brand';
import { useLocale } from '../../i18n/LocaleProvider';
import { Copy, ErrorNotice, colors } from '../../components/ui';
import { AccountButton, AccountCanvas, DemoNotice, LanguageSwitch, useAccountLayout } from '../auth/AccountLayout';
import { errorKey } from '../auth/AuthScreen';
import type { TranslationKey } from '../../i18n/strings';
export function LandingScreen() {
  const { user, logout, switchAgency } = useAuth();
  const { t, locale } = useLocale();
  const layout = useAccountLayout();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [about, setAbout] = useState(false);
  if (!user) return null;
  const agency = user.role === 'AGENCY';
  async function signOut() {
    setPending(true); setError(null);
    try { await logout(); } catch (cause) { setError(errorKey(cause)); } finally { setPending(false); }
  }
  return <AccountCanvas style={{ gap: layout.tiny ? 8 : 14 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}><Brand size={28}/><LanguageSwitch /></View>
    <Copy accessibilityLiveRegion="polite" style={{ fontSize: 12, lineHeight: 18, color: colors.teal, fontWeight: '600' }}>{t('signedIn')}</Copy>
    <Copy accessibilityRole="header" style={{ fontSize: layout.tiny ? 24 : 28, fontWeight: '700', lineHeight: layout.tiny ? 30 : 35 }}>{agency ? locale === 'ar' ? user.agency?.nameAr : user.agency?.name : t('welcomeUser')}</Copy>
    {agency && user.agencies.length > 1 && <View style={{ gap: 8 }}>
      <Copy style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>{t('chooseAgency')}</Copy>
      <View style={{ flexDirection: locale === 'ar' ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
        {user.agencies.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: item.id === user.agency?.id, disabled: pending || switching !== null }} disabled={pending || switching !== null || item.id === user.agency?.id} onPress={() => {
          setError(null); setSwitching(item.id);
          void switchAgency(item.id).catch((cause) => setError(errorKey(cause))).finally(() => setSwitching(null));
        }} style={{ width: '48%', minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: item.id === user.agency?.id ? colors.teal : '#D5E0DF', backgroundColor: item.id === user.agency?.id ? '#E5F3EE' : '#FDFEFC', justifyContent: 'center', padding: 10 }}><Copy style={{ fontSize: 13, fontWeight: '600', lineHeight: 19, color: item.id === user.agency?.id ? colors.teal : colors.ink }}>{switching === item.id ? t('pending') : (item.id === user.agency?.id ? '✓ ' : '') + (locale === 'ar' ? item.nameAr : item.name)}</Copy></Pressable>)}
      </View>
    </View>}
    <View style={{ gap: 4, padding: layout.tiny ? 12 : 16, borderRadius: 16, backgroundColor: '#EFF5F1', borderWidth: 1, borderColor: '#DFE8E2' }}>
      <Copy style={{ fontSize: 12, lineHeight: 18, color: colors.muted }}>{t('account')} · {t(agency ? 'agency' : 'user')}</Copy>
      <Copy style={{ fontWeight: '700', fontSize: layout.tiny ? 16 : 19, lineHeight: 25 }}>{user.displayName}</Copy>
      <Copy style={{ textAlign: 'left', writingDirection: 'ltr', fontSize: 13, lineHeight: 19 }} selectable>{user.email}</Copy>
    </View>
    <Copy style={{ fontSize: 14, lineHeight: 21, color: '#49636E' }}>{t(agency ? 'agencyFuture' : 'userFuture')}</Copy>
    {error && <ErrorNotice text={t(error)} />}
    <View style={{ flex: 1, minHeight: 0 }} />
    <AccountButton title={t('logout')} compact pending={pending} disabled={switching !== null} secondary onPress={() => void signOut()} />
    <Pressable accessibilityRole="button" onPress={() => setAbout(true)} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ color: colors.teal, fontSize: 13, lineHeight: 19 }}>{t('about')}</Copy></Pressable>
    <DemoNotice open={about} close={() => setAbout(false)} />
  </AccountCanvas>;
}
