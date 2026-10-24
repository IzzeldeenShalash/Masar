import { createHash, randomBytes } from 'node:crypto';
import { Algorithm, hash, verify } from '@node-rs/argon2';
export const randomToken = () => randomBytes(32).toString('base64url');
export const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export const hashPassword = (password: string) => hash(password, { algorithm: Algorithm.Argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
export async function verifyPassword(encoded: string, password: string) {
  try { return await verify(encoded, password); } catch { return false; }
}
