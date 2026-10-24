import React from 'react';
import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '../../../src/i18n/LocaleProvider';
export default function AgencyLayout() {
  const { locale } = useLocale(); const { width } = useWindowDimensions(); const ar = locale === 'ar';
  return <Tabs screenOptions={{ headerShown: false, tabBarPosition:'bottom', tabBarActiveTintColor: '#087F82', tabBarStyle: width>=1000?{display:'none'}:{backgroundColor:'#FFFFFF',direction:ar?'rtl':'ltr'}, tabBarItemStyle: { minHeight: 48 }, tabBarLabelStyle: { fontWeight: '600' } }}>
    <Tabs.Screen name="workspace" options={{ title: ar ? 'نظرة عامة' : 'Overview', tabBarIcon: ({ focused }) => <Ionicons name="grid-outline" color={focused ? '#087F82' : '#617582'} size={23}/> }}/>
    <Tabs.Screen name="agency-reports" options={{ title: ar ? 'البلاغات' : 'Reports', tabBarIcon: ({ focused }) => <Ionicons name="documents-outline" color={focused ? '#087F82' : '#617582'} size={23}/> }}/>
    <Tabs.Screen name="agency-alerts" options={{ title: ar ? 'الإعلانات' : 'Alerts', tabBarIcon: ({ focused }) => <Ionicons name="megaphone-outline" color={focused ? '#087F82' : '#617582'} size={23}/> }}/>
    <Tabs.Screen name="agency-profile" options={{ title: ar ? 'الملف الشخصي' : 'Profile', tabBarIcon: ({ focused }) => <Ionicons name="person-outline" color={focused ? '#087F82' : '#617582'} size={23}/> }}/>
  </Tabs>;
}
