import React from 'react';
import {Tabs} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useLocale} from '../../../src/i18n/LocaleProvider';
import {useResident} from '../../../src/features/resident/data';
import {OnboardingScreen} from '../../../src/features/resident/OnboardingScreen';
import {Page,Feedback} from '../../../src/features/resident/ui';
export default function UserTabs(){const {locale}=useLocale();const ar=locale==='ar';const q=useResident();if(!q.data)return <Page><Feedback loading={q.isPending} error={q.isError} retry={()=>void q.refetch()}/></Page>;if(!q.data.profile.onboardingCompleted)return <OnboardingScreen profile={q.data.profile}/>;return <Tabs screenOptions={{headerShown:false,lazy:true,tabBarActiveTintColor:'#087F82',tabBarStyle:{backgroundColor:'white',direction:ar?'rtl':'ltr'},tabBarItemStyle:{minHeight:48}}}>{([{name:'home',en:'Home',ar:'الرئيسية',icon:'home-outline'},{name:'reports',en:'Reports',ar:'بلاغاتي',icon:'document-text-outline'},{name:'alerts',en:'Alerts',ar:'التنبيهات',icon:'notifications-outline'},{name:'profile',en:'Profile',ar:'الملف الشخصي',icon:'person-outline'}] as const).map(t=><Tabs.Screen key={t.name} name={t.name} options={{title:ar?t.ar:t.en,tabBarIcon:({focused})=><Ionicons name={t.icon} size={23} color={focused?"#087F82":"#617582"}/>}}/>)}</Tabs>;}
