import mongoose from 'mongoose';
import { readdir, stat, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Incident, Photo, ReportDraftModel } from './resident-db';
export async function markPhotoForDeletion(userId: string, id: string) {
  const session = await mongoose.startSession(); let claimed = false;
  try { await session.withTransaction(async () => {
    claimed = false;
    if (await Incident.exists({ photoIds: id }).session(session) || await ReportDraftModel.exists({ userId, 'data.photoIds': id }).session(session)) return;
    const photo = await Photo.findOneAndUpdate({ _id: id, userId, state: 'unattached' }, { $set: { state: 'deleting' } }, { session });
    claimed = !!photo;
  }); return claimed; } finally { await session.endSession(); }
}
export async function cleanupPhotos(folder: string, now = new Date()) {
  const directory = resolve(folder);
  const expired = await Photo.find({ state: 'unattached', expiresAt: { $lte: now } }).limit(100);
  for (const p of expired) await markPhotoForDeletion(p.userId.toString(), p.id);
  const deleting = await Photo.find({ state: 'deleting' }).limit(100);
  for (const p of deleting) {
    if (!/^[a-f\d-]{36}\.jpg$/i.test(p.filename)) continue;
    try { await unlink(resolve(directory, p.filename)); } catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) continue; }
    await Photo.deleteOne({ _id: p._id, state: 'deleting' });
  }
  // Recover writes interrupted between file creation and the database insert.
  const files = await readdir(directory).catch(() => []);
  for (const name of files) {
    if (!/^[a-f\d-]{36}\.jpg$/i.test(name)) continue;
    const path = resolve(directory, name); const info = await stat(path).catch(() => null);
    if (info?.isFile() && info.mtimeMs < now.getTime() - 86400000 && !await Photo.exists({ filename: name })) await unlink(path).catch(() => undefined);
  }
}
export function startPhotoCleanup(folder: string) {
  let running = false;
  const run = async () => { if (running) return; running = true; try { await cleanupPhotos(folder); } catch { console.error('Photo cleanup deferred; it will retry.'); } finally { running = false; } };
  void run(); const timer = setInterval(() => void run(), 3600000); timer.unref(); return () => clearInterval(timer);
}
