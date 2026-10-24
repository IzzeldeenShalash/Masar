import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Brand } from '../../components/Brand';
import { useRouter } from 'expo-router';
import { useLocale } from '../../i18n/LocaleProvider';
import { Copy, colors } from '../../components/ui';
import { AccountButton, AccountCanvas, DemoNotice, LanguageSwitch, accountStyles, useAccountLayout } from './AccountLayout';
import { NeighborhoodArt } from './NeighborhoodArt';

export function WelcomeScreen() {
  const { t, locale, error } = useLocale();
  const router = useRouter();
  const layout = useAccountLayout();
  const [about, setAbout] = useState(false);
  return <AccountCanvas style={{ gap: layout.tiny ? 10 : layout.dense ? 14 : 18 }}>
    <View style={{ flexDirection: locale === 'ar' ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: layout.tight ? 0 : layout.dense ? 8 : 16, minHeight: 48 }}>
      <Brand size={34}/>
      <Pressable accessibilityRole="button" accessibilityLabel={t('about')} onPress={() => setAbout(true)} style={{ minHeight: 44, justifyContent: 'center' }}><View style={{ paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#E1F1EB', borderRadius: 18 }}><Copy style={{ color: '#00594E', fontWeight: '600', fontSize: 13, lineHeight: 19 }}>{t('demoBadge')}</Copy></View></Pressable>
    </View>
    <View style={{ flex: 1, minHeight: 70, maxHeight: layout.tight ? 240 : 300 }}><NeighborhoodArt /></View>
    <View style={{ gap: layout.tiny ? 6 : 10 }}>
      <Copy accessibilityRole="header" style={[accountStyles.heading, { fontSize: layout.tiny ? 27 : 32, lineHeight: layout.tiny ? 33 : 39 }]}>{t('welcomeHeadline')}</Copy>
      <Copy style={[accountStyles.subtitle, { fontSize: layout.tiny ? 15 : 18, lineHeight: layout.tiny ? 21 : 25 }]}>{t('welcomeDescription')}</Copy>
    </View>
    <View style={{ gap: 12 }}>
      <AccountButton compact={layout.dense} title={t('getStarted')} onPress={() => router.push('/signup')} />
      <AccountButton compact={layout.dense} secondary title={t('login')} onPress={() => router.push('/login')} />
    </View>
    {error && <Copy accessibilityRole="alert" style={{ color: colors.red, fontSize: 12 }}>{t('languageError')}</Copy>}
    <LanguageSwitch pill />
    <DemoNotice open={about} close={() => setAbout(false)} />
  </AccountCanvas>;
}
