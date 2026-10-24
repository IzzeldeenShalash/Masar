import {TriageAnalysis} from './stage8-db';
import {triageDigest} from './assistant-service';
import {AIAnalysis} from './ai-db';
import {analysisDigest} from './ai-service';
import type { Express, Response } from 'express';
import mongoose from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { categorySchema, reportDraftSchema, reportSchema } from '@masar/shared';
import { Incident, NotificationPreference, Photo, ReportDraftModel, ResidentNotificationModel } from './resident-db';
import { reportDtos } from './report-dto';
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const pageSchema = z.object({ cursor: objectId.optional(), q: z.string().trim().max(100).default(''), filter: z.enum(['all', 'active', 'awaiting', 'closed']).default('all'), category: categorySchema.optional(), limit: z.coerce.number().int().min(1).max(50).default(15) }).strict();
const draftInput = z.object({ version: z.number().int().min(0), data: reportDraftSchema }).strict();
const visibilityInput = z.object({ visible: z.boolean(), summary: z.string().trim().max(240) }).strict().refine(v => !v.visible || v.summary.length >= 15);
class Conflict extends Error {}
function conflict(res: Response, message = 'The draft or attachment changed. Refresh before retrying.') { return res.status(409).json({ error: { code: 'VALIDATION', message } }); }
function invalid(res: Response) { return res.status(400).json({ error: { code: 'VALIDATION', message: 'Check the report fields and your photo attachments.' } }); }
function escaped(value: string) { return [...value].map(c => '.*+?^${}()|[]\\'.includes(c) ? `\\${c}` : c).join(''); }
export function registerReportRoutes(app: Express) {
  app.get('/resident/reports', async (req, res) => {
    const parsed = pageSchema.safeParse(req.query); if (!parsed.success) return invalid(res); const p = parsed.data;
    const query = { userId: req.account!.id, ...(p.cursor ? { _id: { $lt: p.cursor } } : {}), ...(p.category ? { category: p.category } : {}), ...(p.filter === 'closed' ? { status: 'closed' } : p.filter === 'awaiting' ? { status: 'awaiting_citizen_confirmation' } : p.filter === 'active' ? { status: { $nin: ['closed', 'awaiting_citizen_confirmation'] } } : {}), ...(p.q ? { $or: ['title', 'caseNumber', 'description', 'locationLabel', 'landmark'].map(key => ({ [key]: { $regex: escaped(p.q), $options: 'i' } })) } : {}) };
    const records = await Incident.find(query).sort({ _id: -1 }).limit(p.limit + 1); const hasNext = records.length > p.limit; const items = records.slice(0, p.limit);
    res.json({ items: await reportDtos(items), nextCursor: hasNext ? items.at(-1)!.id : null });
  });
  app.get('/resident/reports/:id', async (req, res) => {
    if (!objectId.safeParse(req.params.id).success) return res.status(404).json({ error: { code: 'FORBIDDEN', message: 'Report unavailable.' } });
    const report = await Incident.findOne({ _id: req.params.id, userId: req.account!.id });
    if (!report) return res.status(404).json({ error: { code: 'FORBIDDEN', message: 'Report unavailable.' } });
    res.json((await reportDtos([report]))[0]);
  });
  app.post('/resident/reports/:id/visibility', async (req, res) => {
    const input = visibilityInput.safeParse(req.body); if (!input.success || !objectId.safeParse(req.params.id).success) return invalid(res);
    const report = await Incident.findOneAndUpdate({ _id: req.params.id, userId: req.account!.id }, { $set: { publicVisibility: input.data.visible, publicSummary: input.data.visible ? input.data.summary : '' }, $push: { history: { message: input.data.visible ? 'Reporter enabled a separate community summary.' : 'Reporter made the report private.', messageAr: input.data.visible ? 'فعّل صاحب البلاغ ملخصًا منفصلًا للمجتمع.' : 'جعل صاحب البلاغ البلاغ خاصًا.', actor: req.account!.displayName, type: 'visibility_changed', visibility: 'reporter', date: new Date() } } });
    if (!report) return res.status(404).json({ error: { code: 'FORBIDDEN', message: 'Report unavailable.' } });
    res.json({ saved: true });
  });
  app.get('/resident/public-reports', async (req, res) => {
    const parsed = z.object({ cursor: objectId.optional() }).strict().safeParse(req.query); if (!parsed.success) return invalid(res);
    const rows = await Incident.find({ publicVisibility: true, ...(parsed.data.cursor ? { _id: { $lt: parsed.data.cursor } } : {}) }).sort({ _id: -1 }).limit(16).select('title publicSummary category status createdAt isDemo'); const items = rows.slice(0, 15);
    res.json({ items: items.map(r => ({ id: r.id, title: r.title, summary: r.publicSummary, category: r.category, status: r.status, createdAt: r.createdAt, isDemo: r.isDemo })), nextCursor: rows.length > 15 ? items.at(-1)!.id : null });
  });
  app.get('/resident/draft', async (req, res) => {
    const draft = await ReportDraftModel.findOne({ userId: req.account!.id });
    res.json(draft ? { data: draft.data, version: draft.version, updatedAt: draft.updatedAt } : null);
  });
  app.post('/resident/draft', async (req, res) => {
    const parsed = draftInput.safeParse(req.body); if (!parsed.success) return invalid(res);
    const { data, version } = parsed.data; if (new Set(data.photoIds).size !== data.photoIds.length) return invalid(res);
    const session = await mongoose.startSession();
    try {
      let saved;
      await session.withTransaction(async () => {
        const photos = await Photo.updateMany({ _id: { $in: data.photoIds }, userId: req.account!.id, state: 'unattached' }, { $set: { expiresAt: new Date(Date.now() + 7 * 86400000) } }, { session });
        if (photos.matchedCount !== data.photoIds.length) throw new Conflict();
        saved = await ReportDraftModel.findOneAndUpdate({ userId: req.account!.id, version }, { $set: { data }, $inc: { version: 1 } }, { upsert: version === 0, returnDocument: 'after', session });
        if (!saved) throw new Conflict();
      });
      const draft = saved! as unknown as { data: unknown; version: number; updatedAt: Date };
      return res.json({ data: draft.data, version: draft.version, updatedAt: draft.updatedAt });
    } catch (error) { if (error instanceof Conflict || (error instanceof mongoose.mongo.MongoServerError && error.code === 11000)) return conflict(res); throw error; }
    finally { await session.endSession(); }
  });
  app.post('/resident/draft/discard', async (req, res) => {
    const input = z.object({ version: z.number().int().min(1) }).strict().safeParse(req.body); if (!input.success) return invalid(res);
    const draft = await ReportDraftModel.findOneAndDelete({ userId: req.account!.id, version: input.data.version });
    if (!draft) return conflict(res);
    // Referenced evidence is never erased here. The cleanup worker only claims unattached files.
    await Photo.updateMany({ userId: req.account!.id, _id: { $in: draft.data.photoIds }, state: 'unattached' }, { $set: { expiresAt: new Date() } });
    res.json({ saved: true });
  });
  app.post('/resident/reports', async (req, res) => {
    const input = reportSchema.safeParse(req.body); if (!input.success) return invalid(res);
    if(input.data.kind==='improvement'&&!input.data.publicVisibility)return invalid(res);
    const { draftVersion, analysisId, triageId, ...fields } = input.data;
    const hash = createHash('sha256').update(JSON.stringify(fields)).digest('hex');
    const existing = await Incident.findOne({ userId: req.account!.id, submissionId: fields.submissionId });
    if (existing) {
      const same = existing.inputDigest ? existing.inputDigest === hash : existing.title === fields.title && existing.description === fields.description && existing.category === fields.category && existing.landmark === fields.landmark && existing.locationLabel === fields.location.label && (existing.latitude ?? null) === (fields.location.latitude ?? null) && (existing.longitude ?? null) === (fields.location.longitude ?? null) && existing.photoIds.map(String).join(',') === fields.photoIds.join(',') && existing.publicVisibility === (fields.publicVisibility ?? false) && (existing.publicSummary ?? '') === (fields.publicSummary ?? '');
      return same ? res.json({ id: existing.id, caseNumber: existing.caseNumber }) : conflict(res, 'This request ID already belongs to a different report.');
    }
    if (new Set(fields.photoIds).size !== fields.photoIds.length) return invalid(res);
    if (await Photo.countDocuments({ _id: { $in: fields.photoIds }, userId: req.account!.id, state: 'unattached' }) !== fields.photoIds.length) return invalid(res);
    const session = await mongoose.startSession();
    let result: { id: string; caseNumber: string } | undefined;
    try {
      await session.withTransaction(async () => {
        const draft = await ReportDraftModel.findOne({ userId: req.account!.id }).session(session);
        if (draft && draft.data.submissionId === fields.submissionId && draft.version !== draftVersion) throw new Conflict();
        const analysis=analysisId?await AIAnalysis.findOne({_id:analysisId,userId:req.account!.id,submissionId:fields.submissionId,inputDigest:analysisDigest(fields),status:'succeeded',incidentId:null}).session(session):null;
        const reportId = new mongoose.Types.ObjectId();
        if(triageId)await TriageAnalysis.updateOne({_id:triageId,userId:req.account!.id,sourceDigest:triageDigest(fields),issueId:null},{$set:{issueId:reportId}},{session});
        if(analysis){analysis.incidentId=reportId;await analysis.save({session});}
        const claimed = await Photo.updateMany({ _id: { $in: fields.photoIds }, userId: req.account!.id, state: 'unattached' }, { $set: { state: 'attached', incidentId: reportId }, $unset: { expiresAt: '' } }, { session });
        if (claimed.matchedCount !== fields.photoIds.length) throw new Conflict();
        const [report] = await Incident.create([{ ...fields, analysisId:analysis?._id??null, _id: reportId, inputDigest: hash, userId: req.account!.id, caseNumber: `MS-${randomBytes(5).toString('hex').toUpperCase()}`, latitude: fields.location.latitude ?? null, longitude: fields.location.longitude ?? null, locationLabel: fields.location.label, publicVisibility: fields.publicVisibility ?? false, history: [{ message: 'Submitted. Awaiting manual agency review and acceptance.', messageAr: 'تم إرسال البلاغ. بانتظار مراجعة الجهة يدويًا وقبول المسؤولية.', actor: req.account!.displayName, type: 'submitted', visibility: 'reporter', metadata: { routing: 'manual' } }] }], { session });
        const preference = await NotificationPreference.findOne({ userId: req.account!.id }).session(session);
        if (preference?.reportUpdates !== false) await ResidentNotificationModel.updateOne({ userId: req.account!.id, eventKey: `submitted:${report.id}` }, { $setOnInsert: { title: 'Report received', titleAr: 'تم استلام البلاغ', body: report.caseNumber, bodyAr: report.caseNumber, reportId } }, { upsert: true, session });
        if (draft?.data.submissionId === fields.submissionId) await ReportDraftModel.deleteOne({ _id: draft._id, version: draft.version }, { session });
        result = { id: report.id, caseNumber: report.caseNumber };
      });
      return res.status(201).json(result);
    } catch (error) {
      if (error instanceof Conflict) return conflict(res);
      if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) { const duplicate = await Incident.findOne({ userId: req.account!.id, submissionId: fields.submissionId }); if (duplicate?.inputDigest === hash) return res.json({ id: duplicate.id, caseNumber: duplicate.caseNumber }); return conflict(res); }
      throw error;
    } finally { await session.endSession(); }
  });
}
