import {eraseRecordingFile} from './recording-lifecycle';
import {readRecording} from './voice-file';
import React,{useEffect,useRef,useState} from 'react';
import {Platform,View,Switch,Linking} from 'react-native';
import {useAudioRecorder,useAudioRecorderState,RecordingPresets,requestRecordingPermissionsAsync,setAudioModeAsync} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import {useQuery} from '@tanstack/react-query';
import {request} from '../../api/client';
import {useLocale} from '../../i18n/LocaleProvider';
import {useWords,useErrorMessage} from '../resident/data';
import {Card,Txt,Button,Field,c} from '../resident/ui';
import {Pulse,Badge} from './Motion';
export type AssistantStatus={provider:string;model:string;label:string;configured:boolean;images:boolean;voiceProvider:string;voiceConfigured:boolean};
export function VoiceRecorder({onTranscript,onClose}:{onTranscript:(text:string)=>void;onClose:()=>void}){
  const w=useWords();const errorText=useErrorMessage();const {locale}=useLocale();const recorder=useAudioRecorder({...RecordingPresets.HIGH_QUALITY,web:{mimeType:Platform.OS==='web'&&typeof MediaRecorder!=='undefined'&&MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'audio/mp4',bitsPerSecond:128000}});const state=useAudioRecorderState(recorder,200);const [phase,setPhase]=useState<'idle'|'recording'|'recorded'|'processing'|'transcript'>('idle');const [error,setError]=useState(''),[blocked,setBlocked]=useState(false),[consent,setConsent]=useState(false),[text,setText]=useState('');const file=useRef<string|null>(null),mounted=useRef(true),cancel=useRef(0),working=useRef(false),closing=useRef(false);
  const [isClosing,setIsClosing]=useState(false);
  const active=(nonce:number)=>mounted.current&&!closing.current&&nonce===cancel.current;
  const status=useQuery({queryKey:['assistant-status'],queryFn:()=>request<AssistantStatus>('/assistant/status')});
  async function erase(){await eraseRecordingFile(file,async uri=>{if(Platform.OS==='web')URL.revokeObjectURL(uri);else await FileSystem.deleteAsync(uri,{idempotent:true});});}
  async function resetAudio(){try{await setAudioModeAsync({allowsRecording:false});}catch{/* Closing and text reporting remain available. */}}
  useEffect(()=>{if(state.url&&mounted.current&&!closing.current)file.current=state.url;},[state.url]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;cancel.current++;void erase();};},[]);
  async function stop(){
    if(working.current||closing.current)return;
    working.current=true;const nonce=cancel.current;
    try{await recorder.stop();if(!active(nonce))return;file.current=recorder.uri??file.current;if(!file.current)throw new Error('Recording unavailable');setPhase('recorded');}
    catch{if(active(nonce)){setError(w('Could not finish recording. Continue by typing.','تعذر إنهاء التسجيل. تابع بالكتابة.'));setPhase('idle');}}
    finally{working.current=false;await resetAudio();}
  }
  useEffect(()=>{if(phase==='recording'&&state.durationMillis>=59000)void stop();},[phase,state.durationMillis]);
  async function start(){
    if(working.current||closing.current)return;
    working.current=true;const nonce=cancel.current;setError('');setBlocked(false);
    try{
      await erase();if(!active(nonce))return;
      const permission=await requestRecordingPermissionsAsync();if(!active(nonce))return;
      if(!permission.granted){setBlocked(!permission.canAskAgain);throw new Error(w('Microphone permission denied. Text reporting is still available.','رُفض إذن الميكروفون. الإبلاغ النصي متاح.'));}
      await setAudioModeAsync({allowsRecording:true,playsInSilentMode:true});if(!active(nonce))return;
      await recorder.prepareToRecordAsync();if(!active(nonce))return;
      file.current=recorder.uri;recorder.record({forDuration:60});setPhase('recording');
    }catch(e){if(active(nonce))setError(e instanceof Error?e.message:w('Microphone unavailable.','الميكروفون غير متاح.'));}
    finally{working.current=false;}
  }
  async function process(){if(!file.current||working.current||closing.current)return;working.current=true;setPhase('processing');setError('');const generation=cancel.current;try{const {data,mimeType}=await readRecording(file.current);if(data.length>4000000)throw new Error(w('Recording exceeds 3 MB. Record a shorter message.','التسجيل أكبر من ٣ ميغابايت. سجّل رسالة أقصر.'));const response=await request<{text:string}>('/assistant/transcribe','POST',{data,mimeType,locale,allowExternal:consent},125000);if(!active(generation))return;setText(response.text);setPhase('transcript');await erase();}catch(e){if(active(generation)){setError(errorText(e));setPhase('recorded');}}finally{working.current=false;}}
  async function close(){
    if(closing.current)return;
    closing.current=true;cancel.current++;setIsClosing(true);
    try{
      if(phase==='recording'&&mounted.current){
        try{await recorder.stop();}catch{/* It may already have auto-stopped. */}
        if(mounted.current)try{file.current=recorder.uri??file.current;}catch{/* Navigation may have released it. */}
      }
      await erase();await resetAudio();
    }finally{if(mounted.current)onClose();}
  }
  return <Card><Badge label={w('Voice report · recording upload, not a live call','بلاغ صوتي · رفع تسجيل وليس مكالمة مباشرة')}/><Txt size={12} color={c.muted}>{w('Up to 60 seconds / 3 MB. Audio is processed in request memory and is not stored by Masar. Your edited transcript is saved only when you send it.','حتى ٦٠ ثانية / ٣ ميغابايت. يعالج مسار الصوت في ذاكرة الطلب ولا يخزنه. يُحفظ النص المعدل عند إرساله فقط.')}</Txt><Txt size={12}>{status.data?.voiceProvider==='gemini'?w('Audio will be sent to Google Gemini. Google provider retention/terms apply.','سيُرسل الصوت إلى Google Gemini وتطبق شروط واحتفاظ المزود.'):status.data?.voiceProvider==='whisper'?w('Audio goes to the configured Whisper server. Keep it on a trusted local server.','يُرسل الصوت لخادم Whisper المحدد. استخدم خادمًا محليًا موثوقًا.'):w('Transcription is not configured. You can still type your message.','تحويل الصوت غير مهيأ. يمكنك كتابة رسالتك.')}</Txt>{status.data?.voiceProvider==='gemini'&&<View style={{flexDirection:'row',alignItems:'center',gap:12}}><Switch accessibilityLabel={w('Allow Google audio processing','السماح بمعالجة الصوت لدى Google')} value={consent} onValueChange={setConsent}/><Txt size={12}>{w('I agree to send this recording to Google.','أوافق على إرسال هذا التسجيل إلى Google.')}</Txt></View>}
  {phase==='idle'&&<Button disabled={!status.data?.voiceConfigured||status.data.voiceProvider==='gemini'&&!consent} onPress={()=>void start()}>{w('Start recording','بدء التسجيل')}</Button>}{phase==='recording'&&<><Pulse label={`${w('Recording','جارٍ التسجيل')} · ${Math.floor(state.durationMillis/1000)} / 60 s`}/><Button onPress={()=>void stop()}>{w('Stop recording','إيقاف التسجيل')}</Button></>}{phase==='recorded'&&<><Button onPress={()=>void process()}>{w('Transcribe / retry','تحويل إلى نص / إعادة المحاولة')}</Button><Button secondary onPress={()=>{void erase();setPhase('idle');}}>{w('Record again','إعادة التسجيل')}</Button></>}{phase==='processing'&&<Pulse label={w('Transcribing your recording…','جارٍ تحويل تسجيلك إلى نص…')}/>}{phase==='transcript'&&<><Field label={w('Edit the transcript','تعديل النص المنسوخ')} value={text} onChangeText={setText} multiline maxLength={3000}/><Button disabled={!text.trim()} onPress={()=>onTranscript(text.trim())}>{w('Use edited transcript in assistant','استخدام النص المعدل في المساعد')}</Button></>}{!!error&&<Txt color={c.red}>{error}</Txt>}{blocked&&Platform.OS!=='web'&&<Button secondary onPress={()=>void Linking.openSettings()}>{w('Open microphone settings','فتح إعدادات الميكروفون')}</Button>}{status.isError&&<Button secondary onPress={()=>void status.refetch()}>{w('Retry voice configuration','إعادة تحميل إعداد الصوت')}</Button>}<Button secondary busy={isClosing} onPress={()=>void close()}>{w('Cancel voice · continue typing','إلغاء الصوت · متابعة الكتابة')}</Button></Card>;
}
