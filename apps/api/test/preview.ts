// Optional local UI test harness. Real MongoDB + real API; disposable data only.
// No environment URI is read, and nothing connects to the user's configured DB.
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readConfig } from '../src/config';
import { connect, disconnect } from '../src/db';
import { migrate } from '../src/migrations';
import { seed } from '../src/seed-data';
import { buildApp } from '../src/app';
import { once } from 'node:events';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../mobile/dist');
await readFile(resolve(root, 'index.html'));
const mongo = await MongoMemoryServer.create({ instance: { dbName: 'masar_ui_test' }, binary: { version: '8.2.1' } });
await connect(mongo.getUri()); await migrate(); await seed();
const app = await buildApp(readConfig({ MONGODB_URI: mongo.getUri(), NODE_ENV: 'test' }));
const api = app.listen(3001, '127.0.0.1');
await once(api, 'listening');
const types: Record<string, string> = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.ico': 'image/x-icon' };
const web = createServer(async (request, response) => {
  const path = resolve(root, '.' + new URL(request.url ?? '/', 'http://localhost').pathname);
  if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try {
    const file = extname(path) ? path : resolve(root, 'index.html');
    const data = await readFile(file); response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(data);
  } catch { response.writeHead(404).end(); }
});
web.listen(8081, '127.0.0.1', () => console.info('Disposable UI test environment: http://localhost:8081 — uses real temporary MongoDB, not your configured database.'));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
  web.close(); api.close(() => { void disconnect().then(() => mongo.stop()).then(() => process.exit(0)); });
});
