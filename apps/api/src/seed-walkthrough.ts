import {readConfig} from './config';
import {connect,disconnect} from './db';
import {migrate} from './migrations';
import {seed} from './seed-data';
import {seedWalkthrough} from './walkthrough-seed';
try{const config=readConfig();if(!config.DEMO_MODE||config.NODE_ENV==='production')throw new Error('Demo only');await connect(config.MONGODB_URI);await migrate();await seed();await seedWalkthrough();console.info('Fictional Stage 7 walkthrough records added. Existing report states/passwords are preserved.');}catch{console.error('Walkthrough seed requires reachable MongoDB, DEMO_MODE=true and a non-production environment.');process.exitCode=1;}finally{await disconnect();}
