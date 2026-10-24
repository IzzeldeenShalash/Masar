import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import type { Express } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buildApp, requireRole } from '../src/app';
import { readConfig } from '../src/config';
import { connect, disconnect, Agency, Session, User } from '../src/db';
import { migrate } from '../src/migrations';
import { seed, demoPassword } from '../src/seed-data';
import { digest } from '../src/security';
import { ApiError } from '../../mobile/src/api/errors';
import { sessionFailure } from '../../mobile/src/auth/session-state';

let mongo: MongoMemoryServer;
let app: Awaited<ReturnType<typeof buildApp>>;
const origin = 'http://localhost:8081';
const password = 'A strong demo!2026';
const signup = { displayName: 'Fictional Citizen', email: 'new@masar.example', password };
before(async () => {
  mongo = await MongoMemoryServer.create({ instance: { dbName: 'masar_auth_test' }, binary: { version: '8.2.1' } });
  await connect(mongo.getUri()); await migrate(); await migrate(); await seed(); await seed();
});
beforeEach(async () => {
  app = await buildApp(readConfig({ MONGODB_URI: mongo.getUri(), NODE_ENV: 'test' }), (target) => {
    target.get('/test/user', requireRole('USER'), (_req, res) => { res.json({ ok: true }); });
    target.get('/test/agency', requireRole('AGENCY'), (_req, res) => { res.json({ ok: true }); });
  });
});
after(async () => { await disconnect(); await mongo?.stop(); });
type RequestOptions = { method?: string; url: string; payload?: string | Record<string, unknown>; headers?: Record<string, string> };
// Supertest sends actual HTTP requests to Express on an ephemeral local port.
function send(target: Express, options: string | RequestOptions) {
  const input = typeof options === 'string' ? { url: options } : options;
  const agent = supertest(target);
  const outgoing = input.method === 'POST' ? agent.post(input.url) : input.method === 'OPTIONS' ? agent.options(input.url) : agent.get(input.url);
  if (input.headers) outgoing.set(input.headers);
  return input.payload === undefined ? outgoing : outgoing.send(input.payload);
}
const post = (url: string, payload: Record<string, unknown>, headers: Record<string, string> = {}) => send(app, { method: 'POST', url, payload, headers });
async function login(email = 'user@demo.com') {
  const response = await post('/auth/login', { email, password: demoPassword });
  assert.equal(response.statusCode, 200); return response.body;
}

test('health checks real MongoDB and exposes demo mode', async () => {
  const result = await send(app, '/health'); assert.equal(result.statusCode, 200); assert.deepEqual(result.body, { status: 'ok', demoMode: true });
});
test('fresh seed creates exactly one user demo and one agency demo with two service memberships', async () => {
  assert.equal(await User.countDocuments(), 2);
  assert.equal(await User.countDocuments({ role: 'USER' }), 1);
  assert.equal(await User.countDocuments({ role: 'AGENCY' }), 1);
  const account = await login('agency@demo.com');
  assert.equal(account.user.agencies.length, 2);
});
test('agency selection is authorized server-side and persists in the session', async () => {
  const account = await login('agency@demo.com');
  const madar = account.user.agencies.find((item: { name: string }) => item.name === 'Madar Roads');
  const headers = { authorization: `Bearer ${account.token}` };
  const selected = await post('/auth/agency', { agencyId: madar.id }, headers);
  assert.equal(selected.statusCode, 200); assert.equal(selected.body.user.agency.name, 'Madar Roads');
  const me = await send(app, { url: '/auth/me', headers });
  assert.equal(me.body.user.agency.id, madar.id);
  assert.equal((await post('/auth/agency', { agencyId: '000000000000000000000000' }, headers)).statusCode, 403);
  const citizen = await login();
  assert.equal((await post('/auth/agency', { agencyId: madar.id }, { authorization: `Bearer ${citizen.token}` })).statusCode, 403);
});
test('single-agency members cannot switch into another agency', async () => {
  const noor = await Agency.findOne({ key: 'noor' });
  const madar = await Agency.findOne({ key: 'madar' });
  const demo = await User.findOne({ email: 'agency@demo.com' }).select('+passwordHash');
  await User.create({ email: 'restricted@masar.example', displayName: 'Restricted Demo', passwordHash: demo!.passwordHash, role: 'AGENCY', agencyId: noor!._id, agencyIds: [noor!._id] });
  const account = await login('restricted@masar.example');
  assert.equal(account.user.agencies.length, 1);
  assert.equal((await post('/auth/agency', { agencyId: madar!.id }, { authorization: `Bearer ${account.token}` })).statusCode, 403);
});
test('signup normalizes email, creates only USER, returns safe DTO; duplicate rejected', async () => {
  const result = await post('/auth/signup', { ...signup, email: '  NEW@MASAR.EXAMPLE  ' });
  assert.equal(result.statusCode, 201); const body = result.body;
  assert.equal(body.user.role, 'USER'); assert.equal(body.user.email, signup.email); assert.equal(body.user.agency, null);
  assert.equal('passwordHash' in body.user, false); assert.equal(body.token.length, 43);
  const record = await User.findOne({ email: signup.email }).select('+passwordHash');
  assert.match(record!.passwordHash, /^\$argon2id\$/); assert.notEqual(record!.passwordHash, password);
  const session = await Session.findOne({ userId: body.user.id }).lean();
  assert.equal(session!.tokenDigest, digest(body.token)); assert.notEqual(session!.tokenDigest, body.token);
  const duplicate = await post('/auth/signup', signup); assert.equal(duplicate.statusCode, 409); assert.equal(duplicate.body.error.code, 'SIGNUP_UNAVAILABLE');
});
test('database uniqueness survives simultaneous signup requests', async () => {
  const responses = await Promise.all([1, 2].map(() => send(app, { method: 'POST', url: '/auth/signup', payload: { ...signup, email: 'concurrent@masar.example' } })));
  assert.deepEqual(responses.map((r) => r.statusCode).sort(), [201, 409]);
  assert.equal(await User.countDocuments({ email: 'concurrent@masar.example' }), 1);
});
test('public signup rejects privileged fields and invalid forms', async () => {
  const forbidden = await post('/auth/signup', { ...signup, email: 'privilege@masar.example', role: 'AGENCY', agencyId: 'anything' });
  assert.equal(forbidden.statusCode, 400); assert.equal(await User.countDocuments({ email: 'privilege@masar.example' }), 0);
  const invalid = await post('/auth/signup', { displayName: '', email: 'bad', password: 'short' }); assert.equal(invalid.statusCode, 400);
});
test('login errors are indistinguishable for unknown email and wrong password; portal input rejected', async () => {
  const a = await send(app, { method: 'POST', url: '/auth/login', payload: { email: 'unknown@masar.example', password } });
  const b = await send(app, { method: 'POST', url: '/auth/login', payload: { email: 'user@demo.com', password: 'incorrect' } });
  assert.equal(a.statusCode, 401); assert.deepEqual(a.body, b.body);
  assert.equal((await post('/auth/login', { email: 'user@demo.com', password: demoPassword, role: 'AGENCY' })).statusCode, 400);
});
test('seeded agency and citizen tokens enforce role authorization server-side', async () => {
  const agency = await login('agency@demo.com');
  assert.equal(agency.user.role, 'AGENCY'); assert.equal(agency.user.agency.name, 'Noor Electricity');
  const citizen = await login();
  for (const [token, route, status] of [[agency.token, '/test/agency', 200], [agency.token, '/test/user', 403], [citizen.token, '/test/agency', 403], [citizen.token, '/test/user', 200]] as const) {
    const result = await send(app, { url: route, headers: { authorization: `Bearer ${token}` } }); assert.equal(result.statusCode, status);
  }
  assert.equal((await send(app, '/test/agency')).statusCode, 401);
  assert.equal((await send(app, '/auth/me')).statusCode, 401);
});
test('native session survives a new API instance; logout revokes it', async () => {
  const { token } = await login();
  const second = await buildApp(readConfig({ MONGODB_URI: mongo.getUri(), NODE_ENV: 'test' }));
  const headers = { authorization: `Bearer ${token}` };
  assert.equal((await send(second, { url: '/auth/me', headers })).statusCode, 200);
  assert.equal((await post('/auth/logout', {}, headers)).statusCode, 204);
  assert.equal((await send(app, { url: '/auth/me', headers })).statusCode, 401);
});
test('expired session rejected immediately, independently of MongoDB TTL cleanup', async () => {
  const { token } = await login(); await Session.updateOne({ tokenDigest: digest(token) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await send(app, { url: '/auth/me', headers: { authorization: `Bearer ${token}` } })).statusCode, 401);
});
test('web uses HttpOnly SameSite cookie, never returns token, and requires CSRF even with Authorization header', async () => {
  const response = await send(app, { method: 'POST', url: '/auth/login', headers: { origin }, payload: { email: 'user@demo.com', password: demoPassword } });
  assert.equal(response.statusCode, 200); assert.equal(response.body.token, undefined);
  const setCookie = (response.headers['set-cookie'] as unknown as string[])[0];
  assert.equal(setCookie.includes('HttpOnly'), true); assert.equal(setCookie.includes('SameSite=Strict'), true);
  const cookie = setCookie.split(';')[0];
  assert.equal((await send(app, { url: '/auth/me', headers: { origin, cookie } })).statusCode, 200);
  assert.equal((await post('/auth/logout', {}, { origin, cookie })).statusCode, 403);
  assert.equal((await post('/auth/logout', {}, { origin, cookie, authorization: 'Bearer bypass' })).statusCode, 403);
  assert.equal((await post('/auth/logout', {}, { origin, cookie, 'x-csrf-token': response.body.csrfToken })).statusCode, 204);
  assert.equal((await send(app, { url: '/auth/me', headers: { origin, cookie } })).statusCode, 401);
});
test('foreign origins and non-JSON requests rejected', async () => {
  assert.equal((await post('/auth/login', { email: signup.email, password }, { origin: 'https://evil.example' })).statusCode, 403);
  const response = await send(app, { method: 'POST', url: '/auth/login', payload: 'email=test', headers: { 'content-type': 'text/plain' } }); assert.equal(response.statusCode, 415);
});
test('Express parser returns safe errors for malformed and oversized JSON', async () => {
  const malformed = await send(app, { method: 'POST', url: '/auth/login', payload: '{broken', headers: { 'Content-Type': 'application/json' } });
  assert.equal(malformed.statusCode, 400); assert.equal(malformed.body.error.code, 'VALIDATION');
  const oversized = await post('/auth/login', { email: 'user@demo.com', password: 'x'.repeat(20_000) });
  assert.equal(oversized.statusCode, 413); assert.equal(oversized.body.error.code, 'VALIDATION');
  assert.equal(JSON.stringify(malformed.body).includes('SyntaxError'), false);
});
test('Expo web CORS preflight permits configured origin and blocks foreign origin', async () => {
  const allowed = await send(app, { method: 'OPTIONS', url: '/auth/login', headers: { origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-csrf-token' } });
  assert.equal(allowed.statusCode, 204); assert.equal(allowed.headers['access-control-allow-origin'], origin);
  assert.equal(allowed.headers['access-control-allow-credentials'], 'true');
  const blocked = await send(app, { method: 'OPTIONS', url: '/auth/login', headers: { origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
  assert.equal(blocked.statusCode, 403);
});
test('login rate limiting returns safe 429 responses', async () => {
  let status = 0;
  for (let i = 0; i < 11; i++) {
    const result = await send(app, { method: 'POST', url: '/auth/login', payload: { email: 'unknown@masar.example', password } }); status = result.statusCode;
  }
  assert.equal(status, 429);
});
test('client classifies network/5xx as recovery and only explicit 401 as expiry', () => {
  assert.equal(sessionFailure(new ApiError('NETWORK')), 'connection');
  assert.equal(sessionFailure(new ApiError('UNAVAILABLE', 503)), 'connection');
  assert.equal(sessionFailure(new ApiError('UNAUTHORIZED', 401)), 'expired');
});
test('environment rejects insecure production, invalid booleans, non-Mongo URI', () => {
  assert.throws(() => readConfig({ MONGODB_URI: 'file:masar.db' }));
  assert.throws(() => readConfig({ MONGODB_URI: mongo.getUri(), DEMO_MODE: 'no' }));
  assert.throws(() => readConfig({ MONGODB_URI: mongo.getUri(), NODE_ENV: 'production' }));
});
