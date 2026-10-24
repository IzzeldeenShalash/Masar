import { readConfig } from './config';
import { connect, disconnect } from './db';
import { migrate } from './migrations';
try {
  await connect(readConfig().MONGODB_URI);
  await migrate();
  console.info('Database migrations applied.');
} catch { console.error('Migration failed. Check database connectivity and migration permissions.'); process.exitCode = 1; }
finally { await disconnect(); }
