import mongoose, { Schema } from 'mongoose';

export const agencySchema = new Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true }, nameAr: { type: String, required: true },
}, { timestamps: true });
export const userSchema = new Schema({
  displayName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['USER', 'AGENCY'], required: true },
  agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', default: null },
  agencyIds: [{ type: Schema.Types.ObjectId, ref: 'Agency' }],
}, { timestamps: true });
export const sessionSchema = new Schema({
  tokenDigest: { type: String, required: true, unique: true },
  csrfToken: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  activeAgencyId: { type: Schema.Types.ObjectId, ref: 'Agency', default: null },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
}, { timestamps: true });
export const Agency = mongoose.model('Agency', agencySchema);
export const User = mongoose.model('User', userSchema);
export const Session = mongoose.model('Session', sessionSchema);
export async function connect(uri: string) {
  await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 5000 });
}
export async function disconnect() { await mongoose.disconnect(); }
