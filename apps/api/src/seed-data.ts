import {up as seedRules} from './migrations/009-local-ai';
import { hashPassword } from './security';
import { Agency, Session, User } from './db';
import { demoAccounts } from '@masar/shared';
import { seedResident } from './resident-seed';
export const demoPassword = demoAccounts.password;
export const agencies = [
  { key: 'noor', name: 'Noor Electricity', nameAr: 'نور للكهرباء' },
  { key: 'madar', name: 'Madar Roads', nameAr: 'مدار للطرق' },
];
export async function seed() {
  const passwordHash = await hashPassword(demoPassword);
  const records = [];
  for (const agency of agencies) {
    const record = await Agency.findOneAndUpdate({ key: agency.key }, { $setOnInsert: agency }, { upsert: true, returnDocument: 'after' });
    records.push(record);
  }
  const existing = await User.findOne({ email: demoAccounts.agency });
  if (existing && existing.role !== 'AGENCY') throw new Error('Demo agency email is already assigned to another role');
  const agencyUser = await User.findOneAndUpdate({ email: demoAccounts.agency }, { $setOnInsert: {
    displayName: 'Masar Demo Agency Member', passwordHash, role: 'AGENCY', agencyId: records[0]._id,
  } }, { upsert: true, returnDocument: 'after' });
  if (agencyUser.role !== 'AGENCY') throw new Error('Demo agency role mismatch');
  await User.updateOne({ _id: agencyUser._id, role: 'AGENCY' }, { $set: { agencyId: records[0]._id, agencyIds: records.map((record) => record._id) } });
  // Existing demo sessions cannot retain a service agency removed from the demo.
  await Session.updateMany({ userId: agencyUser._id, activeAgencyId: { $nin: records.map((record) => record._id) } }, { $set: { activeAgencyId: records[0]._id } });
  const citizen = await User.findOne({ email: demoAccounts.user });
  if (citizen && citizen.role !== 'USER') throw new Error('Demo user email is already assigned to another role');
  await User.updateOne({ email: demoAccounts.user }, { $setOnInsert: {
    displayName: 'Rana Demo', passwordHash, role: 'USER', agencyId: null,
  } }, { upsert: true });
  await seedResident(); await seedRules();
}
