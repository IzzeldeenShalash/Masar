import { readConfig } from './config';
import { connect, disconnect } from './db';
import { migrate } from './migrations';
import { seed } from './seed-data';
try {
  const config = readConfig();
  if (!config.DEMO_MODE || config.NODE_ENV === 'production') throw new Error('Seed disabled');
  await connect(config.MONGODB_URI);
  await migrate();
  await seed();
  console.info('Fictional demo accounts seeded. Existing passwords remain unchanged. See README for demo access.');
} catch { console.error('Seed failed. Requires a reachable database, DEMO_MODE=true and non-production environment.'); process.exitCode = 1; }
finally { await disconnect(); }
