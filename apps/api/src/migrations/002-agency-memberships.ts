import { User } from '../db';
export async function up() {
  // Preserve existing single-agency accounts. Demo membership is assigned only by seed.
  await User.collection.updateMany({ role: 'AGENCY', agencyIds: { $exists: false } }, [{ $set: { agencyIds: ['$agencyId'] } }]);
  await User.collection.updateMany({ role: 'USER', agencyIds: { $exists: false } }, { $set: { agencyIds: [] } });
}
