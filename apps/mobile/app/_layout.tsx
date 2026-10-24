import {LiveNotifications} from '../src/features/stage8/LiveNotifications';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LocaleProvider, useLocale } from '../src/i18n/LocaleProvider';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { RecoveryScreen } from '../src/features/auth/RecoveryScreen';
import { AnimatedSplash } from '../src/features/auth/AnimatedSplash';
import { DeviceLocationProvider } from '../src/features/resident/location';
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } } });
function Routes() {
  const { state, user } = useAuth();
  const { ready } = useLocale();
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => { if (ready) void SplashScreen.hideAsync(); }, [ready]);
  if (!ready) return null;
  if (!introDone) return <AnimatedSplash onComplete={() => setIntroDone(true)} />;
  if (state === 'loading' || state === 'connection') return <RecoveryScreen />;
  return <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
    <Stack.Screen name="index" />
    <Stack.Protected guard={state === 'guest'}>
      <Stack.Screen name="login" /><Stack.Screen name="signup" />
    </Stack.Protected>
    <Stack.Protected guard={state === 'authenticated' && user?.role === 'USER'}><Stack.Screen name="(user)" /></Stack.Protected>
    <Stack.Protected guard={state === 'authenticated' && user?.role === 'AGENCY'}><Stack.Screen name="(agency)" /></Stack.Protected>
  </Stack>;
}
export default function RootLayout() {
  return <SafeAreaProvider><StatusBar barStyle="dark-content" /><QueryClientProvider client={queryClient}><LocaleProvider><AuthProvider><DeviceLocationProvider><LiveNotifications/><Routes /></DeviceLocationProvider></AuthProvider></LocaleProvider></QueryClientProvider></SafeAreaProvider>;
}

export {ErrorBoundary} from 'expo-router';
