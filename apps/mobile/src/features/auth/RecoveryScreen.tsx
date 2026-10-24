import React from 'react';
import { ActivityIndicator, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import art from '../../../assets/neighborhood-welcome.png';
import { useAuth } from '../../auth/AuthProvider';
import { Brand } from '../../components/Brand';
import { useLocale } from '../../i18n/LocaleProvider';
import { apiUrl } from '../../api/client';
import { Copy, Disclosure, colors } from '../../components/ui';
import { AccountButton, AccountCanvas, accountStyles } from './AccountLayout';
export function RecoveryScreen() {
  const auth = useAuth();
  const { t } = useLocale();
  const loading = auth.state === 'loading';
  return <AccountCanvas><View style={{ flex: 1, justifyContent: 'center', gap: 22 }}>
    <Brand size={36}/>
    {!loading&&<View style={{height:140,alignItems:'center',justifyContent:'center'}}><Image source={art} resizeMode="contain" style={{width:'100%',height:140,opacity:.35}}/><View style={{position:'absolute',backgroundColor:'#FAFCFA',padding:12,borderRadius:40}}><Ionicons name="cloud-offline-outline" size={44} color={colors.muted}/></View></View>}
    {loading && <ActivityIndicator size="large" color={colors.teal} />}
    <Copy accessibilityRole="header" style={accountStyles.heading}>{t(loading ? 'validating' : 'connectionTitle')}</Copy>
    {!loading && <><Copy accessibilityLiveRegion="polite">{t(auth.storageError ? 'storageError' : 'connectionBody')}</Copy>
      <AccountButton title={t('retry')} onPress={() => void auth.retry()} />
      <Disclosure title={t('details')}><Copy selectable style={{ writingDirection: 'ltr', textAlign: 'left', fontSize: 13 }}>{apiUrl}</Copy><Copy style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>{t('connectionHelp')}</Copy></Disclosure>
    </>}
  </View></AccountCanvas>;
}
