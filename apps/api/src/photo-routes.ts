import type { Express } from 'express';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { Photo, Incident } from './resident-db';
import { canReadAgencyCase } from './case-access';
import { markPhotoForDeletion, cleanupPhotos } from './photo-cleanup';
const schema = z.object({ uploadId: z.uuid(), data: z.string().max(2800000).regex(/^[A-Za-z0-9+/]+={0,2}$/) }).strict();
// No static uploads directory: authentication, ownership and role checks run first.
export function registerPhotos(app: Express, folder: string, prefix = '/resident/photos') {
  const directory = resolve(folder);
  app.post(prefix, async (req, res) => {
    const agencyId=req.account!.role==='AGENCY'?req.account!.agency!.id:null;
    const parsed = schema.safeParse(req.body);
    const fail = () => res.status(400).json({ error: { code: 'VALIDATION', message: 'Use a JPEG or PNG photo, up to 2 MB and 24 megapixels.' } });
    if (!parsed.success) return fail();
    const previous = await Photo.findOne({ userId: req.account!.id, uploadId: parsed.data.uploadId });
    if (previous) { if(String(previous.agencyId??'')!==String(agencyId??''))return res.status(403).end();return previous.state === 'deleting' ? res.status(409).json({ error: { code: 'VALIDATION', message: 'This upload was removed. Choose the photo again.' } }) : res.json({ id: previous.id }); }
    if (await Photo.countDocuments({ userId: req.account!.id }) >= 300) return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Photo storage limit reached.' } });
    const input = Buffer.from(parsed.data.data, 'base64');
    if (input.length > 2 * 1024 * 1024) return fail();
    let output: Buffer;
    try { const image = sharp(input, { limitInputPixels: 24000000, animated: false }); const meta = await image.metadata(); if (!['jpeg', 'png'].includes(meta.format ?? '') || (meta.pages ?? 1) > 1) return fail(); output = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer(); } catch { return fail(); }
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.jpg`; const path = resolve(directory, filename);
    await writeFile(path, output, { flag: 'wx' });
    try { const photo = await Photo.create({ userId: req.account!.id, agencyId, uploadId: parsed.data.uploadId, filename, size: output.length }); return res.status(201).json({ id: photo.id }); }
    catch (error) { await unlink(path).catch(() => undefined); const photo = await Photo.findOne({ userId: req.account!.id, uploadId: parsed.data.uploadId }); if (photo) return res.json({ id: photo.id }); throw error; }
  });
  app.get(`${prefix}/:id`, async (req, res) => {
    if (!/^[a-f\d]{24}$/i.test(String(req.params.id))) return res.status(404).end();
    const photo = await Photo.findById(req.params.id);
    if (!photo || photo.state === 'deleting' || !/^[a-f\d-]{36}\.jpg$/i.test(photo.filename)) return res.status(404).end();
    let allowed:boolean;
    if(req.account!.role==='AGENCY'){const agencyId=req.account!.agency!.id;allowed=photo.state==='attached'&&photo.incidentId?await canReadAgencyCase(String(photo.incidentId),agencyId):String(photo.userId)===req.account!.id&&String(photo.agencyId)===agencyId;}
    else allowed=String(photo.userId)===req.account!.id&&!photo.agencyId||!!(photo.incidentId&&await Incident.exists({_id:photo.incidentId,userId:req.account!.id}));
    if(!allowed)return res.status(404).end();
    try { const bytes = await readFile(resolve(directory, photo.filename)); res.set({ 'Content-Type': 'image/jpeg', 'Content-Disposition': 'inline; filename="report-photo.jpg"', 'Cache-Control': 'private, no-store' }).send(bytes); }
    catch { res.status(404).end(); }
  });
  app.post(`${prefix}/:id/remove`, async (req, res) => {
    if (!/^[a-f\d]{24}$/i.test(String(req.params.id)) || !z.object({}).strict().safeParse(req.body).success) return res.status(400).end();
    const photo = await Photo.findOne({ _id: req.params.id, userId: req.account!.id });
    if (!photo) return res.status(404).end();
    if(req.account!.role==='AGENCY'&&String(photo.agencyId)!==req.account!.agency!.id)return res.status(404).end();
    if (!await markPhotoForDeletion(req.account!.id, String(req.params.id))) return res.status(409).json({ error: { code: 'VALIDATION', message: 'Remove this photo from its saved draft first. Submitted evidence cannot be deleted.' } });
    await cleanupPhotos(directory); res.json({ removed: true });
  });
}
