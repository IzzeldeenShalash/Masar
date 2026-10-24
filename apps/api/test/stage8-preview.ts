// Isolated browser walkthrough: no configured cloud database or AI credentials are used.
import {MongoMemoryReplSet} from 'mongodb-memory-server';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {once} from 'node:events';
import {connect,disconnect} from '../src/db';
import {migrate} from '../src/migrations';
import {seed} from '../src/seed-data';
import {buildApp} from '../src/app';
import {readConfig} from '../src/config';
import {attachRealtime} from '../src/realtime';
const root=resolve('apps/mobile/dist-stage8');await readFile(resolve(root,'index.html'));
const mongo=await MongoMemoryReplSet.create({replSet:{count:1,dbName:'stage8_browser'},binary:{version:'8.2.1'}});await connect(mongo.getUri());await migrate();await seed();
const config=readConfig({MONGODB_URI:mongo.getUri(),NODE_ENV:'test',ASSISTANT_PROVIDER:'mock',VOICE_PROVIDER:'disabled'});const app=await buildApp(config);const api=createServer(app),realtime=attachRealtime(api,config);api.listen(3001,'127.0.0.1');await once(api,'listening');
const types:Record<string,string>={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.ttf':'font/ttf','.json':'application/json'};
const web=createServer(async(req,res)=>{const path=resolve(root,'.'+new URL(req.url??'/','http://localhost').pathname);if(!path.startsWith(root+sep)&&path!==root){res.writeHead(403).end();return;}try{const file=extname(path)?path:resolve(root,'index.html');const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404).end();}});web.listen(8081,'127.0.0.1',()=>console.info('Stage 8 disposable browser environment: http://localhost:8081. AI is explicitly mocked; voice provider disabled.'));
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{web.close();void realtime.close(()=>void disconnect().then(()=>mongo.stop()).then(()=>process.exit(0)));});
