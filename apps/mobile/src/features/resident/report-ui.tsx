import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { neighborhoods, type ResidentReport } from '@masar/shared';
import { useLocale } from '../../i18n/LocaleProvider';
import { useWords } from './data';
import { PrivatePhoto } from './PhotoCapture';
import { Card, Icon, Txt, c } from './ui';
import lighting from '../../../assets/showcase-lighting.png';
import roads from '../../../assets/showcase-roads.png';
import waste from '../../../assets/showcase-waste.png';
import water from '../../../assets/showcase-water.png';
import neighborhood from '../../../assets/neighborhood-welcome.png';
export const categoryIcons = { lighting: 'bulb-outline', roads: 'trail-sign-outline', waste: 'trash-outline', water: 'water-outline', other: 'construct-outline', unsure: 'help-circle-outline' } as const;
export function useCategory() { const w = useWords(); return (id: string) => ({ lighting: w('Lighting', 'الإنارة'), roads: w('Roads', 'الطرق'), waste: w('Waste', 'النفايات'), water: w('Water', 'المياه'), other: w('Other', 'أخرى'), unsure: w('Not sure', 'لست متأكدًا') })[id] ?? id; }
export function useArea() { const { locale } = useLocale(); return (id: string) => { const n = neighborhoods.find(n => n.id === id); return n ? `${locale === 'ar' ? n.nameAr : n.name} · ${locale === 'ar' ? n.cityAr : n.city}` : id; }; }
export function useStatus() { const w = useWords(); return (status: string) => ({ submitted: w('Awaiting review', 'بانتظار المراجعة'), under_review: w('Under review', 'قيد المراجعة'), in_progress: w('In progress', 'جارٍ العمل'), awaiting_citizen_confirmation: w('Your confirmation needed', 'بانتظار تأكيدك'), closed: w('Closed', 'مغلق'), reopened: w('Reopened', 'أعيد فتحه') })[status] ?? status; }
export function Status({ status }: { status: string }) { const label = useStatus(); return <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: status === 'closed' ? '#DDF0E7' : status === 'submitted' ? '#EDF1F4' : '#FFF0C8' }}><Txt size={11} color={status === 'closed' ? '#17654B' : status === 'submitted' ? c.muted : '#A85B00'}>{label(status)}</Txt></View>; }
export function sampleImage(category: string) { return category === 'lighting' ? lighting : category === 'waste' ? waste : category === 'water' ? water : category === 'roads' ? roads : neighborhood; }
export function ReportCard({ report, compact = false, agency = false }: { report: ResidentReport; compact?: boolean; agency?: boolean }) {
  const area = useArea(); const { locale } = useLocale(); const w = useWords();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${report.caseNumber}: ${report.title}`} onPress={() => router.push({ pathname: agency ? '/agency-case' : '/report', params: { id: report.id } })}><Card style={{ flexDirection: 'row', gap: 12, padding: compact ? 9 : 13 }}><View style={{ width: compact ? 60 : 84, borderRadius: 13, backgroundColor: '#E3EEE9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>{report.photoIds?.[0] ? <PrivatePhoto id={report.photoIds[0]} height={compact ? 70 : 112}/> : report.isDemo ? <Image source={sampleImage(report.category)} resizeMode="cover" style={{ width: '100%', height: compact ? 70 : 112 }}/> : <Icon name={categoryIcons[report.category]} size={compact ? 29 : 40}/>}</View><View style={{ flex: 1, gap: compact ? 4 : 6 }}>{!compact && <Txt size={10} color={c.muted}>{report.caseNumber}</Txt>}<Txt bold numberOfLines={2} size={compact ? 13 : 15}>{report.title}</Txt><Txt numberOfLines={1} size={11} color={c.muted}>{report.locationLabel ?? area(report.neighborhood)}</Txt>{!compact && <Txt size={10} color={c.muted}>{new Date(report.createdAt).toLocaleDateString(locale)}</Txt>}<Status status={report.status}/>{report.isDemo && <Txt size={9} color={c.muted}>{w('Illustrative showcase', 'مثال توضيحي')}</Txt>}</View><Icon name={locale === 'ar' ? 'chevron-back' : 'chevron-forward'} size={16} color={c.muted}/></Card></Pressable>;
}
