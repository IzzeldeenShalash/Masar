
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { ResidentData } from '@masar/shared';
import { request, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { useLocale } from '../../i18n/LocaleProvider';
export function useResident() {
  const { user, retry } = useAuth(); const focused=useScreenFocus();
  const query = useQuery({ queryKey: ['resident', user?.id], queryFn: () => request<ResidentData>('/resident'), staleTime: 15000, refetchInterval: focused?30000:false });
  useFocusEffect(useCallback(() => { void query.refetch(); }, [query.refetch]));
  useEffect(() => { if (query.error instanceof ApiError && query.error.status === 401) void retry(); }, [query.error, retry]);
  return query;
}
export function useResidentMutation<T>(path: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (body: T) => request<{ id?: string; caseNumber?: string }>(path, 'POST', body), onSuccess: () => client.invalidateQueries({ queryKey: ['resident'] }) });
}
export function useSessionError(error: unknown) {
  const { retry } = useAuth();
  useEffect(() => { if (error instanceof ApiError && error.status === 401) void retry(); }, [error, retry]);
}
export function useWords() {
  const { locale } = useLocale();
  return (en: string, ar: string) => locale === 'ar' ? ar : en;
}

export function useScreenFocus(){const [active,setActive]=useState(false);useFocusEffect(useCallback(()=>{setActive(true);return()=>setActive(false);},[]));return active;}

export function useErrorMessage(){const {locale}=useLocale();return(error:unknown)=>{if(locale==='en'&&error instanceof Error)return error.message;if(error instanceof ApiError){if(error.status===401)return 'انتهت الجلسة. سجّل الدخول مجددًا.';if(error.status===403||error.status===404)return 'هذا العنصر أو الإجراء غير متاح لحسابك الحالي.';if(error.status===409)return 'تغيرت حالة العنصر. حدّثه وتحقق من المسؤولية والمهام والتحويلات المعلقة ثم أعد المحاولة.';if(error.status===400)return 'تحقق من الحقول والمناطق والأوقات والأدلة المطلوبة.';if(error.status===429)return 'طلبات كثيرة. انتظر قليلًا وأعد المحاولة.';return 'تعذر الاتصال بالخادم. تحقق من الاتصال وأعد المحاولة.';}return locale==='ar'?'تعذر إكمال الطلب. حاول مجددًا.':'The request could not complete. Please retry.';};}
