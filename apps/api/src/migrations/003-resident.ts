import { migrateResident } from '../resident-db';
// Idempotent collections and ownership/idempotency indexes for persisted resident records.
export async function up() { await migrateResident(); }
