import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {View,Linking,Platform,AppState} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {JordanLocation} from '@masar/shared';
import {useLocale} from '../../i18n/LocaleProvider';
import {Button,Txt} from './ui';
import {useWords} from './data';
import {useAuth} from '../../auth/AuthProvider';
export type GPSFix=JordanLocation&{accuracy:number|null;timestamp:number};
type Controller={busy:boolean;error:string;blocked:boolean;fix:GPSFix|null;ensure:()=>Promise<GPSFix|null>;locate:(onSelect:(location:JordanLocation)=>void)=>Promise<void>};
const Context=createContext<Controller|null>(null);
export function DeviceLocationProvider({children}:React.PropsWithChildren){
  const {state}=useAuth();const authState=useRef(state);authState.current=state;
  const {locale}=useLocale();const [busy,setBusy]=useState(false),[error,setError]=useState(''),[blocked,setBlocked]=useState(false),[fix,setFix]=useState<GPSFix|null>(null),[enabled,setEnabled]=useState(false),[active,setActive]=useState(AppState.currentState==='active');
  const inFlight=useRef<Promise<GPSFix|null>|null>(null);const latest=useRef<GPSFix|null>(null);
  const accept=useCallback((position:Location.LocationObject):GPSFix|null=>{
    if(authState.current!=='authenticated')return null;
    const {latitude,longitude,accuracy}=position.coords;
    if(Date.now()-position.timestamp>120000)return null;
    if(latitude<29||latitude>33.5||longitude<34.8||longitude>39.4){setError(locale==='ar'?'موقعك الحالي خارج نطاق خريطة الأردن. لم يتم استبداله بموقع افتراضي.':'Your current GPS is outside the Jordan map extent. It has not been replaced with a fictional location.');return null;}
    const value={label:`${locale==='ar'?'موقعي الحالي':'Current location'} · ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,latitude,longitude,accuracy,timestamp:position.timestamp};latest.current=value;setFix(value);setError('');return value;
  },[locale]);
  const obtain=useCallback(async(explicit:boolean)=>{
    if(inFlight.current)return inFlight.current;
    if(!explicit&&latest.current&&Date.now()-latest.current.timestamp<30000)return latest.current;
    const job=(async()=>{setBusy(true);setError('');setBlocked(false);let timer:ReturnType<typeof setTimeout>|undefined;
      try{let permission=await Location.getForegroundPermissionsAsync();const prompted=await AsyncStorage.getItem('masar.location.prompted');
        if(!permission.granted&&(explicit||(!prompted&&permission.status==='undetermined'))){await AsyncStorage.setItem('masar.location.prompted','true');permission=await Location.requestForegroundPermissionsAsync();}
        if(!permission.granted){setBlocked(!permission.canAskAgain);setError(locale==='ar'?'اسمح بالموقع من الإعدادات لاستخدامه تلقائيًا، أو استخدم التحديد اليدوي.':'Allow location in Settings for automatic positioning, or use manual selection.');return null;}
        if(!await Location.hasServicesEnabledAsync())throw new Error('services disabled');
        const position=await Promise.race([Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('GPS timeout')),22000);})]);
        const result=accept(position);if(result)setEnabled(true);return result;
      }catch{setError(locale==='ar'?'تعذر تحديث GPS. تحقق من خدمات الموقع. على الويب يلزم HTTPS أو localhost.':'GPS could not refresh. Check location services. Web requires HTTPS or localhost.');return null;}
      finally{if(timer)clearTimeout(timer);setBusy(false);}
    })();inFlight.current=job;try{return await job;}finally{inFlight.current=null;}
  },[locale,accept]);
  useEffect(()=>{const sub=AppState.addEventListener('change',state=>setActive(state==='active'));return()=>sub.remove();},[]);
  useEffect(()=>{if(state==='guest'){setFix(null);latest.current=null;setEnabled(false);}},[state]);
  useEffect(()=>{if(!enabled||!active||state!=='authenticated')return;let disposed=false;let subscription:Location.LocationSubscription|undefined;
    void Location.watchPositionAsync({accuracy:Location.Accuracy.Balanced,timeInterval:15000,distanceInterval:20},accept,()=>setError(locale==='ar'?'تعذر تحديث الموقع. حاول مجددًا.':'Location refresh paused. Try again.')).then(s=>{if(disposed)s.remove();else subscription=s;}).catch(()=>undefined);
    return()=>{disposed=true;subscription?.remove();};
  },[enabled,active,accept,locale,state]);
  const ensure=useCallback(()=>obtain(false),[obtain]);const locate=useCallback(async(onSelect:(location:JordanLocation)=>void)=>{const value=await obtain(true);if(value)onSelect({label:value.label,latitude:value.latitude,longitude:value.longitude});},[obtain]);
  return <Context.Provider value={{busy,error,blocked,fix,ensure,locate}}>{children}</Context.Provider>;
}
export function useCurrentLocation(){const context=useContext(Context);if(!context)throw new Error('DeviceLocationProvider is required');return context;}
export function GPSButton({controller,onSelect}:{controller:Controller;onSelect:(location:JordanLocation)=>void}){
  const w=useWords();return <View style={{gap:6}}><Button secondary disabled={controller.busy} onPress={()=>void controller.locate(onSelect)}>{controller.busy?w('Updating GPS…','جارٍ تحديث GPS…'):w('◎ Recenter on my location','◎ توسيط الخريطة على موقعي')}</Button>{controller.error&&<Txt size={12} color="#B42318">{controller.error}</Txt>}{controller.blocked&&Platform.OS!=='web'&&<Button secondary onPress={()=>void Linking.openSettings()}>{w('Open Settings','فتح الإعدادات')}</Button>}{controller.fix&&<Txt size={11} color="#617582">{w('GPS accuracy','دقة GPS')}: {controller.fix.accuracy==null?w('not provided','غير متاحة'):`±${Math.round(controller.fix.accuracy)} m`} · {new Date(controller.fix.timestamp).toLocaleTimeString()}</Txt>}</View>;
}
