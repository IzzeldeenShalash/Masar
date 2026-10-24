import mongoose from 'mongoose';
import {registerResidentAlerts} from './alert-routes';
import {alertAudienceFilter,alertDtos} from './alert-service';
import {reportDtos} from './report-dto';
import type { Express, RequestHandler } from 'express';
import { z } from 'zod';
import { profileSchema } from '@masar/shared';
import { User } from './db';
import { AreaAlert, Incident, Resident, ResidentNotificationModel, NotificationPreference, Subscription } from './resident-db';
import { followedAreas, saveAreas, saveShowcaseAreas } from './area-preferences';
import { registerPhotos } from './photo-routes';
import { registerCitizenWorkflow } from './citizen-workflow-routes';
import { registerReportRoutes } from './report-routes';
import { registerPlaceSearch } from './place-search';

export function registerResidentRoutes(app: Express, requireUser: RequestHandler, photonBaseUrl: string, uploadDir: string) {
  app.use('/resident', requireUser);
  registerPlaceSearch(app, photonBaseUrl);
  registerPhotos(app, uploadDir);
  registerReportRoutes(app);
  registerCitizenWorkflow(app);
  registerResidentAlerts(app);
  const invalid = (res: import('express').Response) => res.status(400).json({ error: { code: 'VALIDATION', message: 'Check the submitted fields.' } });
  app.get('/resident', async (req, res) => {
    const userId = req.account!.id;
    const profile = await Resident.findOneAndUpdate({ userId }, { $setOnInsert: { displayName: req.account!.displayName, homeNeighborhood: 'amman-nour', followedNeighborhoods: [], reportUpdates: true, areaAlerts: true, avatarColor: 'teal', location: { label: 'Amman, Jordan', latitude: 31.9539, longitude: 35.9106 } } }, { upsert: true, returnDocument: 'after' });
    const reports = await Incident.find({ userId }).sort({ createdAt: -1 }).limit(8);
    const followedLocations = await followedAreas(userId);
    const preferences = await NotificationPreference.findOneAndUpdate({ userId }, { $setOnInsert: { reportUpdates: profile.reportUpdates, areaAlerts: profile.areaAlerts } }, { upsert: true, returnDocument: 'after' });
    const alerts = await AreaAlert.find({...(await alertAudienceFilter(userId)),publishedAt:{$ne:null},status:{$in:['active','scheduled']}}).sort({startsAt:-1}).limit(100);
    const notices = await ResidentNotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(100);
    const homeAreas=await Subscription.distinct('neighborhoodId',{userId,home:true});
    const counts=await Incident.aggregate([{$match:{userId:new mongoose.Types.ObjectId(userId)}},{$group:{_id:'$status',count:{$sum:1}}}]);
    res.json({contribution:{reports:counts.reduce((sum:number,c:{count:number})=>sum+c.count,0),inProgress:counts.find(c=>c._id==='in_progress')?.count??0,resolved:counts.find(c=>c._id==='closed')?.count??0},
      profile: { displayName: profile.displayName, email: req.account!.email, phone: profile.phone, bio: profile.bio, homeNeighborhood: profile.homeNeighborhood, followedNeighborhoods: profile.followedNeighborhoods, reportUpdates: preferences.reportUpdates, areaAlerts: preferences.areaAlerts, avatarColor: profile.avatarColor, followedLocations, onboardingCompleted: profile.onboardingCompleted, ...(profile.location?.label ? { location: { label: profile.location.label, latitude: profile.location.latitude, longitude: profile.location.longitude } } : {}) },
      reports: await reportDtos(reports),
      alerts: (await alertDtos(alerts,{userId})).map(a=>({...a,affectsHome:a.neighborhoodIds.some(id=>homeAreas.some(home=>String(home)===id))})), 
      notifications: notices.map(n => ({ id: n.id, title: n.title, titleAr: n.titleAr, body: n.body, bodyAr: n.bodyAr, date: n.createdAt, read: n.read, threadId:n.threadId?.toString()??null, reportId: n.reportId?.toString() ?? null, alertId: n.alertId?.toString() ?? null })),
    });
  });
  app.post('/resident/profile', async (req, res) => {
    const input = profileSchema.safeParse(req.body);
    if (!input.success) return invalid(res);
    const { followedLocations, ...fields } = input.data;
    await saveAreas(req.account!.id, input.data.location, followedLocations);
    await saveShowcaseAreas(req.account!.id,fields.followedNeighborhoods);
    await NotificationPreference.updateOne({ userId: req.account!.id }, { $set: { reportUpdates: fields.reportUpdates, areaAlerts: fields.areaAlerts } }, { upsert: true });
    await Resident.findOneAndUpdate({ userId: req.account!.id }, { $set: fields }, { upsert: true, runValidators: true });
    await User.updateOne({ _id: req.account!.id, role: 'USER' }, { $set: { displayName: input.data.displayName } });
    res.json({ saved: true });
  });
  app.post('/resident/preferences',async(req,res)=>{const p=z.object({reportUpdates:z.boolean(),areaAlerts:z.boolean()}).strict().safeParse(req.body);if(!p.success)return invalid(res);await NotificationPreference.updateOne({userId:req.account!.id},{$set:p.data},{upsert:true});res.json({saved:true});});
  app.post('/resident/notifications/read', async (req, res) => {
    const parsed = z.object({ id: z.union([z.literal('all'), z.string().regex(/^[a-f\d]{24}$/i)]) }).strict().safeParse(req.body);
    if (!parsed.success) return invalid(res);
    await ResidentNotificationModel.updateMany({ userId: req.account!.id, ...(parsed.data.id === 'all' ? {} : { _id: parsed.data.id }) }, { $set: { read: true } });
    res.json({ saved: true });
  });
}
