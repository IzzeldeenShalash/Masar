import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, Image, View } from 'react-native';
import type { JordanLocation, ResidentProfile } from '@masar/shared';
import { Page, Txt, Button, c } from './ui';
import { useResidentMutation, useWords } from './data';
import { Brand } from '../../components/Brand';
import { LocationPicker } from './LocationPicker';
import art from '../../../assets/neighborhood-welcome.png';
import { useAuth } from '../../auth/AuthProvider';
import { LanguageSwitch } from '../auth/AccountLayout';
import { useCurrentLocation } from './location';
export function OnboardingScreen({ profile }: { profile: ResidentProfile }) {
  const w = useWords(); const auth = useAuth(); const [location, setLocation] = useState<JordanLocation | undefined>(); const [error, setError] = useState(''); const [signingOut, setSigningOut] = useState(false); const save = useResidentMutation<unknown>('/resident/profile');
  const gps=useCurrentLocation();const picked=useRef(false);
  useEffect(()=>{let disposed=false;void gps.ensure().then(fix=>{if(fix&&!disposed&&!picked.current)setLocation({label:fix.label,latitude:fix.latitude,longitude:fix.longitude});});return()=>{disposed=true;};},[gps.ensure]);
  return <Page><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Brand size={30}/><LanguageSwitch/></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18, paddingBottom: 24 }}><View style={{ height: 130 }}><Image source={art} resizeMode="contain" style={{ width: '100%', height: '100%' }}/></View><Txt bold size={28}>{w('Your neighborhood. Your starting point.', 'حيّك، بداية مسارك.')}</Txt><Txt color={c.muted}>{w('Choose your home area anywhere in Jordan. Use your actual GPS location or select it manually. You can change it and follow other places in Profile.', 'اختر منطقة سكنك في أي مكان بالأردن. استخدم موقع GPS الفعلي أو حدده يدويًا. يمكنك تغييره ومتابعة أماكن أخرى من الملف الشخصي.')}</Txt><LocationPicker value={location} onChange={value=>{picked.current=true;setLocation(value);}}/>{save.isError && <Txt color="#B42318">{w('Could not save. Your selection is still here; retry when connected.', 'تعذر الحفظ. اختيارك ما زال هنا؛ أعد المحاولة عند الاتصال.')}</Txt>}<Button disabled={!location || location.label.trim().length < 2 || save.isPending} onPress={() => { const { email: _email, ...fields } = profile; void _email; save.mutate({ ...fields, location, onboardingCompleted: true }); }}>{save.isPending ? '…' : w('Save and enter Masar', 'احفظ وادخل مسار')}</Button><Txt size={12} color={c.muted}>{w('Hackathon demonstration. Agencies are fictional; no government integration or real dispatch. Your own reports and preferences are saved.', 'عرض هاكاثون. الجهات افتراضية دون ربط حكومي أو إرسال حقيقي. تُحفظ بلاغاتك وتفضيلاتك.')}</Txt>{error && <Txt color="#B42318">{error}</Txt>}<Button secondary disabled={signingOut||save.isPending} onPress={()=>{setSigningOut(true);void auth.logout().catch(()=>setError(w('Could not sign out. Retry when connected.', 'تعذر تسجيل الخروج. أعد المحاولة عند الاتصال.'))).finally(()=>setSigningOut(false));}}>{signingOut?'…':w('Sign out', 'تسجيل الخروج')}</Button></ScrollView></Page>;
}
