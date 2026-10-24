import {startAlertWorker} from './alert-service';
import { readConfig } from './config';
import { connect, disconnect } from './db';
import { buildApp } from './app';
import { migrate } from './migrations';
import { once } from 'node:events';
import mongoose from 'mongoose';
import { startPhotoCleanup } from './photo-cleanup';
try {
  const config = readConfig();
  await connect(config.MONGODB_URI);
  const topology = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') throw new Error('Reporting requires a replica set, such as MongoDB Atlas.');
  await migrate();
  const app = await buildApp(config);
  const server = app.listen(config.API_PORT, config.API_HOST);
  const realtime=attachRealtime(server,config);
  await once(server, 'listening');
  const stopCleanup = startPhotoCleanup(config.UPLOAD_DIR); const stopAlerts=startAlertWorker();
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
    stopCleanup(); stopAlerts();
    void realtime.close();
    server.close(() => { void disconnect(); });
  });
  console.info(`Masar API listening on port ${config.API_PORT}. Demo mode: ${config.DEMO_MODE}.`);
} catch { console.error('API startup failed. Check environment, MongoDB connectivity and port availability.'); await disconnect(); process.exitCode = 1; }
import {attachRealtime} from './realtime';
