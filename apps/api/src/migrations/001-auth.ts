import mongoose from 'mongoose';
import { Agency, Session, User } from '../db';

// Idempotent DDL: safe to retry if a process stops before the migration marker.
export async function up() {
  await Agency.createCollection();
  await User.createCollection();
  await Session.createCollection();
  await Promise.all([Agency.createIndexes(), User.createIndexes(), Session.createIndexes()]);
  // Database-level role invariants also apply to writers outside Mongoose.
  await mongoose.connection.db!.command({ collMod: User.collection.collectionName, validator: {
    $and: [
      { $jsonSchema: { bsonType: 'object', required: ['email', 'displayName', 'passwordHash', 'role'], properties: {
        role: { enum: ['USER', 'AGENCY'] }, email: { bsonType: 'string' },
        passwordHash: { bsonType: 'string' }, displayName: { bsonType: 'string' },
      } } },
      { $or: [{ role: 'USER', agencyId: null }, { role: 'AGENCY', agencyId: { $type: 'objectId' } }] },
    ],
  }, validationLevel: 'strict', validationAction: 'error' });
}
