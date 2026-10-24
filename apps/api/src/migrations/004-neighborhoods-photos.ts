import { migrateStage2, NotificationPreference, Resident } from '../resident-db';
import { saveAreas } from '../area-preferences';
export async function up() {
  await migrateStage2();
  for await (const p of Resident.find().cursor()) {
    await NotificationPreference.updateOne({ userId: p.userId }, { $setOnInsert: { reportUpdates: p.reportUpdates, areaAlerts: p.areaAlerts } }, { upsert: true });
    if (p.location?.label && p.location.latitude != null && p.location.longitude != null) await saveAreas(p.userId.toString(), { label: p.location.label, latitude: p.location.latitude, longitude: p.location.longitude }, []);
  }
}
