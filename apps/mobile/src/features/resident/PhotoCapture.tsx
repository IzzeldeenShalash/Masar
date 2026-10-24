import React, { useEffect, useState } from 'react';
import { View, Image, Pressable, Linking, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { request, photoSource, privatePhotoBlob } from '../../api/client';
import { Button, Txt, Icon, c } from './ui';
import { useWords } from './data';
import { useAuth } from '../../auth/AuthProvider';
export function PrivatePhoto({ id, height = 150, contain = false }: { id: string; height?: number; contain?: boolean }) {
  const {user}=useAuth();const scope=user?.role==='AGENCY'?'agency':'resident';const workspace=user?.agency?.id;
  const [uri, setUri] = useState<string | null>(null); const [error, setError] = useState(false); const [revision, setRevision] = useState(0); const w = useWords();
  useEffect(() => { setError(false); setUri(null); if (Platform.OS !== 'web') return; let disposed = false; let url: string | undefined; void privatePhotoBlob(id,scope).then(blob => { url = URL.createObjectURL(blob); if (!disposed) setUri(url); else URL.revokeObjectURL(url); }).catch(() => { if (!disposed) setError(true); }); return () => { disposed = true; if (url) URL.revokeObjectURL(url); }; }, [id, revision, scope, workspace]);
  if (error) return <Pressable accessibilityRole="button" onPress={() => { setError(false); setRevision(v => v + 1); }} style={{ height, justifyContent: 'center', backgroundColor: '#EDF3EF', padding: 10 }}><Txt size={12}>{w('Photo unavailable · Tap to retry', 'الصورة غير متاحة · اضغط لإعادة المحاولة')}</Txt></Pressable>;
  if (Platform.OS === 'web' && !uri) return <ActivityIndicator style={{ height }} color={c.teal}/>;
  return <Image key={revision} accessibilityLabel={w('Your report photo', 'صورة بلاغك')} source={Platform.OS === 'web' ? { uri: uri! } : photoSource(id,scope)} onError={() => setError(true)} resizeMode={contain ? 'contain' : 'cover'} style={{ width: '100%', height, borderRadius: 12 }}/>;
}
export function PhotoCapture({ ids, onChange, onBusy, onRemove, onPending, required = false }: { ids: string[]; onChange: (ids: string[]) => void; onBusy: (busy: boolean) => void; onRemove?: (id: string) => Promise<void>; onPending?: (pending: boolean) => void; required?: boolean }) {
  const {user}=useAuth();const scope=user?.role==='AGENCY'?'agency':'resident';
  const w = useWords(); const [choice, setChoice] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [blocked, setBlocked] = useState(false);
  const [pending, setPending] = useState<{ uploadId: string; data: string } | null>(null);
  useEffect(() => { onPending?.(!!pending); }, [pending, onPending]);
  async function remove(id: string) { if(busy)return;setBusy(true);onBusy(true);setError('');try{if(onRemove)await onRemove(id);else onChange(ids.filter(x=>x!==id));}catch{setError(w('Could not remove the photo. Refresh the saved draft and retry.','تعذر حذف الصورة. حدّث المسودة المحفوظة وحاول مجددًا.'));}finally{setBusy(false);onBusy(false);} }
  async function upload(payload: { uploadId: string; data: string }) { const saved = await request<{ id: string }>('/'+scope+'/photos', 'POST', payload); onChange([...ids, saved.id]); setPending(null); }
  async function retryUpload() { if (!pending || busy || ids.length >= 3) return; setBusy(true); onBusy(true); setError(''); try { await upload(pending); } catch { setError(w('Upload failed. Your photo remains ready to retry.', 'تعذر الرفع. صورتك جاهزة لإعادة المحاولة.')); } finally { setBusy(false); onBusy(false); } }
  async function choose(camera: boolean) {
    setChoice(false); setError(''); setBlocked(false); setBusy(true); onBusy(true);
    try {
      if (camera && Platform.OS !== 'web') { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) { setBlocked(!permission.canAskAgain); setError(w('Allow camera access in Settings, or choose a photo from your library.', 'اسمح بالوصول للكاميرا من الإعدادات أو اختر صورة من المكتبة.')); return; } }
      const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: .85, exif: false, cameraType: ImagePicker.CameraType.back }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .85, exif: false, allowsMultipleSelection: false });
      if (result.canceled || !result.assets[0]) return;
      const image = result.assets[0];
      const output = await ImageManipulator.manipulateAsync(image.uri, [{ resize: image.width > image.height ? { width: Math.min(image.width, 1600) } : { height: Math.min(image.height, 1600) } }], { compress: .78, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      if (!output.base64 || output.base64.length > 2800000) { setError(w('This photo is too large. Choose a smaller image.', 'الصورة كبيرة جدًا. اختر صورة أصغر.')); return; }
      const payload = { uploadId: Crypto.randomUUID(), data: output.base64 }; setPending(payload); await upload(payload);
    } catch { setError(w('Photo capture/upload failed. Check your connection and retry. Camera requires a physical device; on web use HTTPS/localhost.', 'تعذر التقاط الصورة أو رفعها. تحقق من الاتصال وحاول مجددًا. تتطلب الكاميرا جهازًا فعليًا؛ على الويب استخدم HTTPS أو localhost.')); }
    finally { setBusy(false); onBusy(false); }
  }
  return <View style={{ gap: 8 }}><Txt bold size={13}>{required?w('Completion photos (required, up to 3)','صور الإنجاز (مطلوبة، حتى ٣)'):w('Photos (optional, up to 3)', 'صور (اختياري، حتى ٣)')}</Txt><View style={{ flexDirection: 'row', gap: 8 }}>{ids.map((id, i) => <View key={id} style={{ flex: 1 }}><PrivatePhoto id={id} height={78}/><Pressable accessibilityRole="button" accessibilityLabel={`${w('Remove photo', 'حذف الصورة')} ${i + 1}`} disabled={busy} onPress={() => void remove(id)} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="close-circle" size={20}/></Pressable></View>)}</View>{ids.length < 3 && <Button secondary busy={busy} disabled={busy || !!pending} onPress={() => setChoice(true)}>{busy ? w('Preparing and uploading…', 'جارٍ تجهيز الصورة ورفعها…') : w('＋ Add photo / camera', '＋ أضف صورة أو افتح الكاميرا')}</Button>}{pending && !busy && <Button secondary onPress={()=>void retryUpload()}>{w('Retry photo upload', 'إعادة محاولة رفع الصورة')}</Button>}{pending && !busy && <Button secondary onPress={()=>{setPending(null);setError('');}}>{w('Discard unuploaded photo', 'تجاهل الصورة التي لم تُرفع')}</Button>}{error && <Txt color="#B42318" size={12}>{error}</Txt>}{blocked && Platform.OS !== 'web' && <Button secondary onPress={() => void Linking.openSettings()}>{w('Open Settings', 'فتح الإعدادات')}</Button>}{choice && <View style={{ gap: 10, padding: 12, backgroundColor: '#E8F2EE', borderRadius: 14 }}><Button onPress={() => void choose(true)}>{w('Take a photo', 'التقاط صورة')}</Button><Button secondary onPress={() => void choose(false)}>{w('Choose from library', 'اختر من المكتبة')}</Button><Txt size={12}>{w('Photos are private to your account. Unnecessary metadata is removed before storage.', 'الصور خاصة بحسابك. تُزال البيانات الوصفية غير الضرورية قبل التخزين.')}</Txt><Button secondary onPress={() => setChoice(false)}>{w('Cancel', 'إلغاء')}</Button></View>}</View>;
}
