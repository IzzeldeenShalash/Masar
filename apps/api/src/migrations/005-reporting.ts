import { Incident, Photo, ReportDraftModel } from '../resident-db';
export async function up() {
  await ReportDraftModel.createIndexes();
  await Incident.collection.createIndex({ userId: 1, _id: -1 });
  await Incident.collection.createIndex({ publicVisibility: 1, _id: -1 });
  await Photo.collection.createIndex({ state: 1, expiresAt: 1 });
  for await (const report of Incident.find({ photoIds: { $exists: true, $ne: [] } }).cursor()) await Photo.updateMany({ _id: { $in: report.photoIds }, state: { $ne: 'attached' } }, { $set: { state: 'attached', incidentId: report._id }, $unset: { expiresAt: '' } });
  await Photo.updateMany({ state: { $exists: false } }, { $set: { state: 'unattached', expiresAt: new Date(Date.now() + 7 * 86400000) } });
}
