import {formatTimestamp} from '../../i18n/format';
import React,{useCallback,useState} from 'react';
import {FlatList,View,Pressable} from 'react-native';
import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {useQuery} from '@tanstack/react-query';
import type {ResidentReport} from '@masar/shared';
import {request} from '../../api/client';
import {useAuth} from '../../auth/AuthProvider';
import {useLocale} from '../../i18n/LocaleProvider';
import {useWords,useSessionError,useScreenFocus} from './data';
import {Page,Card,Txt,Feedback,Sheet,c} from './ui';
import {ReportCard} from './report-ui';
import {PrivatePhoto} from './PhotoCapture';
export function ReportUpdatesScreen(){const focused=useScreenFocus();const {id}=useLocalSearchParams<{id:string}>();const {user}=useAuth();const w=useWords();const {locale}=useLocale();const [photo,setPhoto]=useState<string|null>(null);const q=useQuery({queryKey:['report',user?.id,id],queryFn:()=>request<ResidentReport>(`/resident/reports/${id}`),refetchInterval:focused?30000:false});useFocusEffect(useCallback(()=>{void q.refetch();},[q.refetch]));useSessionError(q.error);
  return <Page title={w('Report updates','تحديثات البلاغ')}>{!q.data?<Feedback loading={q.isPending} error={q.isError} retry={()=>void q.refetch()}/>:<FlatList keyboardShouldPersistTaps="handled" data={[...q.data.history].reverse()} keyExtractor={(_,i)=>String(i)} refreshing={q.isRefetching} onRefresh={()=>void q.refetch()} contentContainerStyle={{gap:14,paddingBottom:20}} ListHeaderComponent={<View style={{gap:15,paddingBottom:8}}><ReportCard report={q.data} compact/><Txt bold size={21}>{w('Updates from the accountable team','تحديثات الفريق المسؤول')}</Txt><Txt size={12} color={c.muted}>{w('Latest saved activity. Photos are protected case evidence.','أحدث الأنشطة المحفوظة. الصور أدلة محمية للبلاغ.')}</Txt></View>} renderItem={({item:h})=><Card><Txt size={11} color={c.teal}>{h.actor} · {formatTimestamp(h.date,locale)}</Txt><Txt>{locale==='ar'?h.messageAr:h.message}</Txt>{h.photoIds?.map(p=><Pressable key={p} accessibilityRole="button" onPress={()=>setPhoto(p)}><PrivatePhoto id={p} height={210}/></Pressable>)}</Card>} ListFooterComponent={<Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/report',params:{id}})} style={{minHeight:48,justifyContent:'center'}}><Txt color={c.teal}>{w('Return to report details','العودة لتفاصيل البلاغ')}</Txt></Pressable>}/>}<Sheet visible={!!photo} title={w('Evidence photo','صورة الدليل')} onClose={()=>setPhoto(null)}>{photo&&<PrivatePhoto id={photo} height={350} contain/>}</Sheet></Page>;
}
