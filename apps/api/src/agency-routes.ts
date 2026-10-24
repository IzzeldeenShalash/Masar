import {registerPlaceSearch} from './place-search';
import {registerAgencyAlerts} from './alert-routes';
import type { Express, RequestHandler } from 'express';
import { z } from 'zod';
import { User } from './db';
import { NotificationPreference, Resident } from './resident-db';
import { registerAgencyWorkflow } from './agency-workflow-routes';
import { registerPhotos } from './photo-routes';
const schema = z.object({ displayName: z.string().trim().min(2).max(80), phone: z.string().trim().max(25).regex(/^[+\d ()-]*$/), bio: z.string().trim().max(160), reportUpdates: z.boolean(), areaAlerts: z.boolean() }).strict();
export function registerAgencyRoutes(app: Express, requireAgency: RequestHandler, uploadDir: string, photonBaseUrl: string) {
  app.use('/agency', requireAgency);
  registerPhotos(app, uploadDir, '/agency/photos');
  registerAgencyWorkflow(app);
  registerAgencyAlerts(app); registerPlaceSearch(app,photonBaseUrl,'/agency');
  app.get('/agency/profile', async (req, res) => {
    const profile = await Resident.findOne({ userId: req.account!.id }); const preferences = await NotificationPreference.findOne({ userId: req.account!.id });
    res.json({ displayName: req.account!.displayName, email: req.account!.email, phone: profile?.phone ?? '', bio: profile?.bio ?? '', reportUpdates: preferences?.reportUpdates ?? true, areaAlerts: preferences?.areaAlerts ?? true });
  });
  app.post('/agency/profile', async (req, res) => {
    const input = schema.safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: { code: 'VALIDATION', message: 'Check your profile fields.' } });
    await Resident.updateOne({ userId: req.account!.id }, { $set: { displayName: input.data.displayName, phone: input.data.phone, bio: input.data.bio } }, { upsert: true });
    await NotificationPreference.updateOne({ userId: req.account!.id }, { $set: { reportUpdates: input.data.reportUpdates, areaAlerts: input.data.areaAlerts } }, { upsert: true });
    await User.updateOne({ _id: req.account!.id, role: 'AGENCY' }, { $set: { displayName: input.data.displayName } });
    res.json({ saved: true });
  });
}
