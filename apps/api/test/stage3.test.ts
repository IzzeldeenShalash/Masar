import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, access } from 'node:fs/promises';
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
import { Incident, Photo, ReportDraftModel, ResidentNotificationModel } from '../src/resident-db';
import { cleanupPhotos } from '../src/photo-cleanup';
let mongo: MongoMemoryReplSet; let app: Awaited<ReturnType<typeof buildApp>>; let folder: string; let token: string; let other: string; let ownerId: string;
const draftData = () => ({ title: 'Uneven paving near the square', description: 'Several public paving slabs are loose near the square.', category: 'roads', landmark: 'Private landmark not for sharing', submissionId: randomUUID(), location: { label: 'A manually entered Jordan neighborhood' }, photoIds: [] as string[], publicVisibility: false, publicSummary: '' });
const post = (path: string, body: object, auth=token) => supertest(app).post(path).auth(auth,{type:'bearer'}).send(body);
const get = (path: string, auth=token) => supertest(app).get(path).auth(auth,{type:'bearer'});
before(async()=>{
  mongo=await MongoMemoryReplSet.create({replSet:{count:1,dbName:'stage3_checks'},instanceOpts:[{launchTimeout:60000}],binary:{version:'8.2.1'}});
  folder=await mkdtemp(join(tmpdir(),'masar-stage3-'));await connect(mongo.getUri());await migrate();await migrate();app=await buildApp(readConfig({MONGODB_URI:mongo.getUri(),NODE_ENV:'test',UPLOAD_DIR:folder}));
  const a=await supertest(app).post('/auth/signup').send({displayName:'Stage Three Reporter',email:'reporter@masar.example',password:'A safe stage3!2026'});assert.equal(a.status,201);token=a.body.token;ownerId=a.body.user.id;
  const b=await supertest(app).post('/auth/signup').send({displayName:'Different Reporter',email:'other@masar.example',password:'A safe stage3!2026'});other=b.body.token;
});
after(async()=>{await disconnect();await mongo?.stop();if(folder?.startsWith(join(tmpdir(),'masar-stage3-')))await rm(folder,{recursive:true,force:true});});
test('database drafts survive API restart, reject stale edits and submit exactly once with private timelines',async()=>{
  const data=draftData();const saved=await post('/resident/draft',{version:0,data});assert.equal(saved.status,200);assert.equal(saved.body.version,1);
  assert.equal((await post('/resident/draft',{version:0,data:{...data,title:'Stale overwrite'}})).status,409);
  app=await buildApp(readConfig({MONGODB_URI:mongo.getUri(),NODE_ENV:'test',UPLOAD_DIR:folder}));
  const restored=await get('/resident/draft');assert.equal(restored.body.data.title,data.title);assert.equal((await get('/resident/draft',other)).body,null);
  const [a,b]=await Promise.all([post('/resident/reports',{...data,draftVersion:1}),post('/resident/reports',{...data,draftVersion:1})]);assert.ok([200,201].includes(a.status)||[200,201].includes(b.status));
  const success=[a,b].find(r=>[200,201].includes(r.status))!;const id=success.body.id;
  assert.equal(await Incident.countDocuments({userId:ownerId,submissionId:data.submissionId}),1);assert.equal(await ResidentNotificationModel.countDocuments({userId:ownerId,eventKey:`submitted:${id}`}),1);assert.equal(await ReportDraftModel.countDocuments({userId:ownerId}),0);
  assert.equal((await post('/resident/reports',{...data,draftVersion:1})).body.id,id);assert.equal((await post('/resident/reports',{...data,title:'Changed content with same key',draftVersion:1})).status,409);
  const detail=await get(`/resident/reports/${id}`);assert.equal(detail.body.latitude,null);assert.equal(detail.body.agency,null);assert.equal(detail.body.status,'submitted');assert.equal(detail.body.isDemo,false);assert.equal(detail.body.history[0].type,'submitted');assert.equal(detail.body.history[0].actor,'Stage Three Reporter');assert.equal((await get(`/resident/reports/${id}`,other)).status,404);
  await Incident.updateOne({_id:id},{$push:{history:{message:'Internal secret',messageAr:'Internal secret',visibility:'internal',type:'note'}}});assert.equal((await get(`/resident/reports/${id}`)).body.history.some((h:{message:string})=>h.message==='Internal secret'),false);
});
test('pagination reaches older records, filters/search work and public DTOs exclude private data',async()=>{
  await Incident.insertMany(Array.from({length:205},(_,i)=>({userId:ownerId,submissionId:randomUUID(),caseNumber:`TEST-ARCHIVE-${i}`,title:`Archive issue ${i}`,description:'Private fixture description',category:'roads',status:i%2?'closed':'submitted',locationLabel:'Private place',latitude:31.95,longitude:35.91,history:[]})));
  const ids=new Set<string>();let cursor='';do{const page=await get(`/resident/reports?limit=50${cursor?`&cursor=${cursor}`:''}`);assert.equal(page.status,200);for(const r of page.body.items){assert.equal(ids.has(r.id),false);ids.add(r.id);}cursor=page.body.nextCursor??'';}while(cursor);assert.equal(ids.size,206);
  const closed=await get('/resident/reports?filter=closed&limit=50');assert.ok(closed.body.items.every((r:{status:string})=>r.status==='closed'));assert.equal((await get('/resident/reports?q=%5B%2E%2A')).body.items.length,0);
  const visible={...draftData(),title:'A publicly shared report',publicVisibility:true,publicSummary:'A short public summary without private identifiers.'};const created=await post('/resident/reports',visible);assert.equal(created.status,201);
  const publicPage=await get('/resident/public-reports',other);const shared=publicPage.body.items.find((r:{id:string})=>r.id===created.body.id);assert.ok(shared);assert.deepEqual(Object.keys(shared).sort(),['category','createdAt','id','isDemo','status','summary','title'].sort());assert.equal(shared.summary,visible.publicSummary);assert.equal(JSON.stringify(shared).includes(visible.landmark),false);assert.equal((await get(`/resident/reports/${created.body.id}`,other)).status,404);
  assert.equal((await post(`/resident/reports/${created.body.id}/visibility`,{visible:false,summary:''},other)).status,404);
  assert.equal((await post(`/resident/reports/${created.body.id}/visibility`,{visible:false,summary:''})).status,200);
  assert.equal((await get('/resident/public-reports',other)).body.items.some((r:{id:string})=>r.id===created.body.id),false);
});
test('photo lifecycle preserves saved/submitted evidence and cleans only unreferenced uploads',async()=>{
  const bytes=await sharp({create:{width:40,height:40,channels:3,background:'#00858A'}}).jpeg().toBuffer();
  async function upload(){const r=await post('/resident/photos',{uploadId:randomUUID(),data:bytes.toString('base64')});assert.equal(r.status,201);return r.body.id as string;}
  const id=await upload();const data={...draftData(),photoIds:[id]};assert.equal((await post('/resident/draft',{version:0,data})).status,200);await Photo.updateOne({_id:id},{$set:{expiresAt:new Date(0)}});await cleanupPhotos(folder);assert.equal((await get(`/resident/photos/${id}`)).status,200);assert.equal((await post(`/resident/photos/${id}/remove`,{})).status,409);
  const submitted=await post('/resident/reports',{...data,draftVersion:1});assert.equal(submitted.status,201);const record=await Photo.findById(id);assert.equal(record?.state,'attached');assert.equal(String(record?.incidentId),submitted.body.id);assert.equal((await post(`/resident/photos/${id}/remove`,{})).status,409);await cleanupPhotos(folder,new Date(Date.now()+30*86400000));assert.equal((await get(`/resident/photos/${id}`)).status,200);
  const unused=await upload();const unusedPhoto=await Photo.findById(unused);await Photo.updateOne({_id:unused},{$set:{expiresAt:new Date(0)}});await cleanupPhotos(folder);assert.equal(await Photo.exists({_id:unused}),null);await assert.rejects(access(join(folder,unusedPhoto!.filename)));
  const discardId=await upload();const discardData={...draftData(),photoIds:[discardId]};assert.equal((await post('/resident/draft',{version:0,data:discardData})).status,200);assert.equal((await post('/resident/draft/discard',{version:7})).status,409);assert.equal((await post('/resident/draft/discard',{version:1})).status,200);await cleanupPhotos(folder);assert.equal((await get(`/resident/photos/${discardId}`)).status,404);
  const raceId=await upload();const raceData={...draftData(),photoIds:[raceId]};const [report,removed]=await Promise.all([post('/resident/reports',raceData),post(`/resident/photos/${raceId}/remove`,{})]);if(report.status===201){assert.ok([404,409].includes(removed.status));assert.equal((await get(`/resident/photos/${raceId}`)).status,200);}else{assert.ok([400,409].includes(report.status));assert.equal(removed.status,200);assert.equal(await Incident.countDocuments({submissionId:raceData.submissionId}),0);}
});
