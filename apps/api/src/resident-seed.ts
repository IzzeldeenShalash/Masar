import {ensureDemoAreas} from './service-areas';
import {Neighborhood} from './resident-db';
import { demoAccounts, neighborhoods } from '@masar/shared';
import { Agency, User } from './db';
import { AreaAlert, Incident, Resident, ResidentNotificationModel } from './resident-db';
export async function seedResident() {
  const user = await User.findOne({ email: demoAccounts.user, role: 'USER' });
  const noor = await Agency.findOne({ key: 'noor' });
  const madar = await Agency.findOne({ key: 'madar' });
  if (!user || !noor || !madar) return; await ensureDemoAreas(); const demoArea=await Neighborhood.findOne({key:"demo:amman-nour"});
  await Resident.updateOne({ userId: user._id }, { $setOnInsert: { displayName: user.displayName, homeNeighborhood: 'amman-nour', bio: 'A clearer path for my neighborhood.', followedNeighborhoods: [] } }, { upsert: true });
  const cases = [
    { title: 'Streetlight not working', description: 'The streetlight beside the park entrance has been off for three evenings. Fictional demonstration case.', category: 'lighting', status: 'in_progress', agencyId: noor._id, number: 'MS-DEMO-1042', offset: 0.002 },
    { title: 'Damaged sidewalk', description: 'Several paving stones are uneven near the neighborhood square. Fictional demonstration case.', category: 'roads', status: 'submitted', agencyId: null, number: 'MS-DEMO-1038', offset: -0.002 },
    { title: 'Debris beside the road', description: 'A small pile of roadworks debris needed collection. This fictional case was confirmed resolved by its reporter.', category: 'waste', status: 'closed', agencyId: madar._id, number: 'MS-DEMO-1025', offset: 0.004 },
  ];
  for (const [i, item] of cases.entries()) {
    const createdAt = new Date(Date.now() - (i + 1) * 86400000);
    const report = await Incident.findOneAndUpdate({ userId: user._id, submissionId: item.number }, { $setOnInsert: { ...item, caseNumber: item.number, userId: user._id, submissionId: item.number, neighborhood: 'amman-nour', landmark: 'Near Al Nour demo park', latitude: neighborhoods[0].latitude + item.offset, longitude: neighborhoods[0].longitude + item.offset, isDemo: true, createdAt, history: [{ message: 'Demo report submitted.', messageAr: 'تم إرسال البلاغ التجريبي.', date: createdAt }, ...(item.status === 'in_progress' ? [{ message: 'Noor Electricity accepted responsibility. Work is in progress.', messageAr: 'قبلت نور للكهرباء المسؤولية. العمل جارٍ.', date: new Date(createdAt.getTime() + 3600000) }] : item.status === 'closed' ? [{ message: 'Madar Roads completed the cleanup; the citizen confirmed resolution.', messageAr: 'أكملت مدار للطرق التنظيف وأكد المواطن الحل.', date: new Date(createdAt.getTime() + 3600000) }] : [])] } }, { upsert: true, returnDocument: 'after' });
    await ResidentNotificationModel.updateOne({ userId: user._id, eventKey: `demo:${item.number}` }, { $setOnInsert: { title: item.status === 'closed' ? 'Your report has been resolved' : item.status === 'in_progress' ? 'Your report is in progress' : 'Your report was received', titleAr: item.status === 'closed' ? 'تم حل بلاغك' : item.status === 'in_progress' ? 'جارٍ العمل على بلاغك' : 'تم استلام بلاغك', body: item.title, bodyAr: 'تحديث بلاغ تجريبي', reportId: report._id } }, { upsert: true });
  }
  for (const item of [
    { key: 'noor-outage', agencyId: noor._id, title: 'Electricity maintenance in Al Nour', titleAr: 'صيانة الكهرباء في حي النور', description: 'A fictional electricity interruption is affecting the demonstration district. Individual reports remain independently tracked.', descriptionAr: 'انقطاع كهرباء تجريبي في الحي الافتراضي. تبقى البلاغات الفردية مستقلة.', status: 'active', instructions: 'Demo notice only. No real service interruption or emergency dispatch.', instructionsAr: 'إشعار تجريبي فقط. لا يوجد انقطاع حقيقي أو إرسال لفرق الطوارئ.' },
    { key: 'madar-roadworks', agencyId: madar._id, title: 'Upcoming neighborhood roadworks', titleAr: 'أعمال طرق قادمة في الحي', description: 'Fictional resurfacing near the demonstration park. The planned work is shown for the hackathon walkthrough.', descriptionAr: 'أعمال تعبيد افتراضية قرب الحديقة التجريبية لعرض تجربة التطبيق.', status: 'scheduled', instructions: 'Use the signed diversion in this fictional scenario.', instructionsAr: 'استخدم التحويلة المحددة ضمن هذا السيناريو الافتراضي.' },
  ]) await AreaAlert.updateOne({ key: item.key }, { $setOnInsert: { ...item, publishedAt:new Date(), type:item.key==='madar-roadworks'?'roadworks':'electricity_maintenance', neighborhoodIds:demoArea?[demoArea._id]:[],version:0, neighborhood: 'amman-nour', startsAt: new Date(Date.now() + (item.status === 'scheduled' ? 86400000 : -3600000)), endsAt: null, isDemo: true, updates: [{ message: 'Fictional agency demonstration announcement.', messageAr: 'إعلان تجريبي لجهة افتراضية.', date: new Date() }] } }, { upsert: true });
}
