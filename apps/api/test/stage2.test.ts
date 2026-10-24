import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import supertest from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { buildApp } from '../src/app';
import { readConfig } from '../src/config';
import { connect, disconnect } from '../src/db';
import { migrate } from '../src/migrations';
import { seed } from '../src/seed-data';
import { Subscription, NotificationPreference } from '../src/resident-db';
let mongo: MongoMemoryReplSet; let app: Awaited<ReturnType<typeof buildApp>>; let folder: string; let owner: string; let outsider: string; let agency: string;
before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, dbName: 'masar_stage2_check' }, instanceOpts: [{ launchTimeout: 60000 }], binary: { version: '8.2.1' } });
  folder = await mkdtemp(join(tmpdir(), 'masar-photos-'));
  await connect(mongo.getUri()); await migrate(); await seed();
  app = await buildApp(readConfig({ MONGODB_URI: mongo.getUri(), NODE_ENV: 'test', UPLOAD_DIR: folder }));
  for (const [email, assign] of [['one@masar.example', (value: string) => { owner = value; }], ['two@masar.example', (value: string) => { outsider = value; }]] as const) {
    const result = await supertest(app).post('/auth/signup').send({ displayName: 'Stage Two Citizen', email, password: 'StageTwo!2026secure' }); assert.equal(result.status, 201); assign(result.body.token);
  }
  const login = await supertest(app).post('/auth/login').send({ email: 'agency@demo.com', password: 'MasarDemo!2026' }); assert.equal(login.status, 200); agency = login.body.token;
});
after(async () => { await disconnect(); await mongo?.stop(); if (folder?.startsWith(join(tmpdir(), 'masar-photos-'))) await rm(folder, { recursive: true, force: true }); });
test('home, arbitrary Jordan follows and independent preferences persist; privileged fields rejected', async () => {
  const initial = await supertest(app).get('/resident').auth(owner, { type: 'bearer' }); assert.equal(initial.status, 200); assert.equal(initial.body.profile.onboardingCompleted, false); assert.deepEqual(initial.body.reports, []);
  const { email, ...profile } = initial.body.profile; void email;
  const payload = { ...profile, location: { label: 'Ajloun selected location', latitude: 32.3337, longitude: 35.7528 }, followedLocations: [{ label: 'Petra selected location', latitude: 30.3285, longitude: 35.4444 }], onboardingCompleted: true, reportUpdates: false };
  assert.equal((await supertest(app).post('/resident/profile').auth(owner, { type: 'bearer' }).send({ ...payload, role: 'AGENCY' })).status, 400);
  assert.equal((await supertest(app).post('/resident/profile').auth(owner, { type: 'bearer' }).send(payload)).status, 200);
  const saved = await supertest(app).get('/resident').auth(owner, { type: 'bearer' }); assert.equal(saved.body.profile.location.latitude, 32.3337); assert.equal(saved.body.profile.followedLocations[0].label, 'Petra selected location'); assert.equal(saved.body.profile.reportUpdates, false); assert.equal(saved.body.profile.onboardingCompleted, true);
  assert.equal(await Subscription.countDocuments(), 2); assert.ok(await NotificationPreference.exists({ reportUpdates: false }));
  const otherProfile = (await supertest(app).get('/resident').auth(outsider, { type: 'bearer' })).body.profile; delete otherProfile.email;
  assert.equal((await supertest(app).post('/resident/profile').auth(outsider, { type: 'bearer' }).send({ ...otherProfile, followedLocations: [{ ...payload.followedLocations[0], label: 'Private label belonging to the other account' }] })).status, 200);
  assert.equal((await supertest(app).get('/resident').auth(owner, { type: 'bearer' })).body.profile.followedLocations[0].label, 'Petra selected location');
  assert.equal((await supertest(app).post('/resident/profile').auth(owner, { type: 'bearer' }).send({ ...payload, followedLocations: [] })).status, 200);
  assert.equal((await supertest(app).get('/resident').auth(owner, { type: 'bearer' })).body.profile.followedLocations.length, 0);
});
test('private photos are decoded, stripped, owned and attached to idempotent real reports', async () => {
  const bytes = await sharp({ create: { width: 100, height: 80, channels: 3, background: '#00858A' } }).jpeg().withMetadata().toBuffer(); const uploadId = randomUUID();
  const upload = await supertest(app).post('/resident/photos').auth(owner, { type: 'bearer' }).send({ uploadId, data: bytes.toString('base64') }); assert.equal(upload.status, 201); const id = upload.body.id;
  const again = await supertest(app).post('/resident/photos').auth(owner, { type: 'bearer' }).send({ uploadId, data: bytes.toString('base64') }); assert.equal(again.body.id, id);
  assert.equal((await supertest(app).get(`/resident/photos/${id}`)).status, 401); assert.equal((await supertest(app).get(`/resident/photos/${id}`).auth(outsider, { type: 'bearer' })).status, 404); assert.equal((await supertest(app).get(`/resident/photos/${id}`).auth(agency, { type: 'bearer' })).status, 403);
  const fetched = await supertest(app).get(`/resident/photos/${id}`).auth(owner, { type: 'bearer' }); assert.equal(fetched.status, 200); const metadata = await sharp(fetched.body).metadata(); assert.equal(metadata.format, 'jpeg'); assert.equal(metadata.exif, undefined);
  const report = { title: 'A real saved sample report', description: 'A paving defect observed at the selected location.', category: 'roads', landmark: '', location: { label: 'Ajloun', latitude: 32.3337, longitude: 35.7528 }, submissionId: randomUUID(), photoIds: [id] };
  assert.equal((await supertest(app).post('/resident/reports').auth(outsider, { type: 'bearer' }).send(report)).status, 400);
  const first = await supertest(app).post('/resident/reports').auth(owner, { type: 'bearer' }).send(report); assert.equal(first.status, 201);
  const duplicate = await supertest(app).post('/resident/reports').auth(owner, { type: 'bearer' }).send(report); assert.equal(duplicate.body.id, first.body.id);
  const snapshot = await supertest(app).get('/resident').auth(owner, { type: 'bearer' }); assert.equal(snapshot.body.reports.length, 1); assert.equal(snapshot.body.reports[0].isDemo, false); assert.equal(snapshot.body.reports[0].agency, null); assert.deepEqual(snapshot.body.reports[0].photoIds, [id]); assert.equal(snapshot.body.notifications.length, 0);
  assert.equal((await supertest(app).post('/resident/photos').auth(owner, { type: 'bearer' }).send({ uploadId: randomUUID(), data: Buffer.from('not a photo').toString('base64') })).status, 400);
});
test('agency settings persist without allowing role or other account changes', async () => {
  assert.equal((await supertest(app).get('/agency/profile').auth(owner, { type: 'bearer' })).status, 403);
  const initial = await supertest(app).get('/agency/profile').auth(agency, { type: 'bearer' }); assert.equal(initial.status, 200);
  const { email, ...fields } = initial.body; void email;
  assert.equal((await supertest(app).post('/agency/profile').auth(agency, { type: 'bearer' }).send({ ...fields, displayName: 'Agency Member Updated', bio: 'Saved agency profile' })).status, 200);
  assert.equal((await supertest(app).get('/agency/profile').auth(agency, { type: 'bearer' })).body.displayName, 'Agency Member Updated');
  assert.equal((await supertest(app).post('/agency/profile').auth(agency, { type: 'bearer' }).send({ ...fields, agencyId: '000000000000000000000000' })).status, 400);
});
