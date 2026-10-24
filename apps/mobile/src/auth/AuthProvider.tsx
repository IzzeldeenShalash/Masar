import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';
import type { Account, AuthResponse, HealthResponse, LoginInput, SignupInput } from '@masar/shared';
import { ApiError, credentials, request } from '../api/client';
import { sessionFailure } from './session-state';
type State = 'loading' | 'guest' | 'authenticated' | 'connection';
const key = 'masar.session';
const Context = createContext<{
  state: State; user: Account | null; demoMode: boolean; expired: boolean; storageError: boolean;
  updateDisplayName: (name: string) => void;
  retry: () => Promise<void>; login: (input: LoginInput) => Promise<void>; signup: (input: SignupInput) => Promise<void>; logout: () => Promise<void>; switchAgency: (agencyId: string) => Promise<void>;
}>(null!);
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState<State>('loading');
  const [user, setUser] = useState<Account | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [expired, setExpired] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const token = useRef<string | null>(null);
  const validatedBefore = useRef(false);
  const generation = useRef(0);
  const busy = useRef(false);
  const queryClient = useQueryClient();
  const clear = useCallback(async () => {
    generation.current += 1;
    credentials.set(null, null); token.current = null; setUser(null); queryClient.clear();
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(key);
  }, [queryClient]);
  const retry = useCallback(async (background = false) => {
    if (busy.current) return;
    const requestGeneration = generation.current;
    busy.current = true; if (!background) setState('loading'); setStorageError(false);
    try {
      if (Platform.OS !== 'web') {
        try { token.current = await SecureStore.getItemAsync(key); } catch { setStorageError(true); throw new ApiError('NETWORK'); }
      }
      if (!background) credentials.set(token.current, null);
      const health = await queryClient.fetchQuery({ queryKey: ['health'], queryFn: () => request<HealthResponse>('/health'), staleTime: 0 });
      setDemoMode(health.demoMode);
      const session = await request<AuthResponse>('/auth/me');
      const reset=process.env.EXPO_PUBLIC_AUTH_RESET;
      if(__DEV__&&reset&&await AsyncStorage.getItem('masar.authReset')!==reset){credentials.set(token.current,session.csrfToken);await request('/auth/logout','POST',{});await clear();await AsyncStorage.setItem('masar.authReset',reset);validatedBefore.current=false;setExpired(false);setState('guest');return;}
      if (requestGeneration !== generation.current) return;
      credentials.set(token.current, session.csrfToken); validatedBefore.current = true; setUser(session.user); setState('authenticated'); setExpired(false);
    } catch (error) {
      if (requestGeneration !== generation.current) return;
      if (sessionFailure(error) === 'expired') {
        try { const hadSession = !!token.current || validatedBefore.current; await clear(); validatedBefore.current = false; setExpired(hadSession); setState('guest'); if(__DEV__&&process.env.EXPO_PUBLIC_AUTH_RESET)await AsyncStorage.setItem('masar.authReset',process.env.EXPO_PUBLIC_AUTH_RESET); }
        catch { setStorageError(true); setState('connection'); }
      } else if (!background) { setState('connection'); }
    } finally { busy.current = false; }
  }, [clear, queryClient]);
  useEffect(() => { void retry(); const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') void retry(validatedBefore.current); }); return () => subscription.remove(); }, [retry]);
  async function authenticate(path: string, input: LoginInput | SignupInput) {
    const session = await request<AuthResponse>(path, 'POST', input);
    credentials.set(session.token ?? null, session.csrfToken);
    if (Platform.OS !== 'web') {
      if (!session.token) throw new ApiError('INTERNAL');
      try { await SecureStore.setItemAsync(key, session.token); }
      catch { await request('/auth/logout', 'POST', {}).catch(() => undefined); credentials.set(null, null); throw new ApiError('INTERNAL'); }
    }
    token.current = session.token ?? null;
    validatedBefore.current = true;
    queryClient.clear(); setExpired(false); setUser(session.user); setState('authenticated');
  }
  async function logout() {
    try { await request('/auth/logout', 'POST', {}); }
    catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
    try { await clear(); validatedBefore.current = false; setExpired(false); setState('guest'); }
    catch { setStorageError(true); setState('connection'); throw new ApiError('INTERNAL'); }
  }
  async function switchAgency(agencyId: string) {
    const session = await request<AuthResponse>('/auth/agency', 'POST', { agencyId });
    queryClient.clear(); setUser(session.user);
  }
  return <Context.Provider value={{ state, user, demoMode, expired, storageError, retry, login: (input) => authenticate('/auth/login', input), signup: (input) => authenticate('/auth/signup', input), logout, switchAgency, updateDisplayName: name => setUser(current => current ? { ...current, displayName: name } : null) }}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
