import {Platform} from 'react-native';
import {normalizeLocale} from './format';
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ar, en, type TranslationKey } from './strings';
type Locale = 'en' | 'ar';
const Context = createContext<{ locale: Locale; ready: boolean; error: boolean; toggle: () => Promise<void>; t: (key: TranslationKey) => string }>(null!);
export function LocaleProvider({ children }: React.PropsWithChildren) {
  const [locale, setLocale] = useState<Locale>('en');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { AsyncStorage.getItem('masar.locale').then((value) => { setLocale(normalizeLocale(value)); }).catch(() => setError(true)).finally(() => setReady(true)); }, []);
  useEffect(()=>{if(Platform.OS==='web'&&typeof document!=='undefined'){document.documentElement.lang=locale;document.documentElement.dir=locale==='ar'?'rtl':'ltr';}},[locale]);
  async function toggle() {
    try { const next = locale === 'en' ? 'ar' : 'en'; await AsyncStorage.setItem('masar.locale', next); setLocale(next); setError(false); }
    catch { setError(true); }
  }
  return <Context.Provider value={{ locale, ready, error, toggle, t: (key) => (locale === 'ar' ? ar : en)[key] }}>{children}</Context.Provider>;
}
export const useLocale = () => useContext(Context);
