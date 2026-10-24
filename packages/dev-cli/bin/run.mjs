#!/usr/bin/env node
import { readFile, copyFile, access } from 'node:fs/promises';
import { constants, realpathSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve, delimiter } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export function nativeStartupCrash(code,signal,nativeFailure=false){return nativeFailure||['SIGSEGV','SIGILL','SIGABRT'].includes(signal)||[134,139,3221225477,3221225501,3221226505,-1073741819,-1073741795,-1073740791].includes(code);}

export function selectLanAddress(interfaces) {
  const choices = Object.entries(interfaces).flatMap(([name, entries]) => (entries ?? [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address))
    .map((entry) => ({ name, address: entry.address })));
  const physical = choices.filter((entry) => !/virtual|vethernet|docker|wsl|vpn|tap|tailscale/i.test(entry.name));
  const ranked = (physical.length ? physical : choices).sort((a, b) => {
    const rank = (name) => /wi-?fi|wlan/i.test(name) ? 0 : /ethernet/i.test(name) ? 1 : 2;
    return rank(a.name) - rank(b.name);
  });
  return ranked[0]?.address;
}
export function connectionSettings(apiEnv, mobileEnv, interfaces) {
  if (!apiEnv.MONGODB_URI || !/^mongodb(?:\+srv)?:\/\//.test(apiEnv.MONGODB_URI)) {
    throw new Error('Paste your online MongoDB URL into MONGODB_URI in apps/api/.env, then run npx run dev again.');
  }
  if (apiEnv.NODE_ENV === 'production') throw new Error('This launcher is for development only.');
  const port = Number(apiEnv.API_PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 8081) throw new Error('API_PORT must be a valid port other than Expo port 8081.');
  const lanIp = selectLanAddress(interfaces);
  const apiUrl = mobileEnv.EXPO_PUBLIC_API_URL || (lanIp ? `http://${lanIp}:${port}` : '');
  let parsed;
  try { parsed = new URL(apiUrl); } catch { throw new Error('Connect to Wi-Fi or set EXPO_PUBLIC_API_URL to your laptop LAN URL in apps/mobile/.env.'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) {
    throw new Error('Phone scanning needs your laptop LAN API URL, not localhost. Set EXPO_PUBLIC_API_URL in apps/mobile/.env.');
  }
  const origins = [...new Set([...(apiEnv.WEB_ORIGINS || 'http://localhost:8081,http://127.0.0.1:8081').split(','), `http://${parsed.hostname}:8081`])].join(',');
  return { port, apiUrl: apiUrl.replace(/\/$/, ''), webApiUrl: mobileEnv.EXPO_PUBLIC_WEB_API_URL || `http://localhost:${port}`, origins };
}
async function environment(folder) {
  const target = resolve(root, folder, '.env');
  try { await copyFile(resolve(root, folder, '.env.example'), target, constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return parseEnv(await readFile(target, 'utf8'));
}
async function available(port) {
  const probe = createServer();
  await new Promise((done, reject) => { probe.once('error', () => reject(new Error(`Port ${port} is already in use. Stop the existing development server first.`))); probe.listen(port, '0.0.0.0', done); });
  await new Promise((done) => probe.close(done));
}
export async function main(args = process.argv.slice(2)) {
  if (!(args[0] === 'demo' && args.length === 1) && (args[0] !== 'dev' || args.slice(1).some((arg) => !['--check', '--clear'].includes(arg)))) throw new Error('Usage: npm run dev [-- --clear] or npm run demo:scenarios');
  // Optional verified local LTS runtime: keep system Node and TLS policy untouched.
  const localRuntime = resolve(root, '.local/node-runtime/node-v22.23.4-win-x64/node.exe');
  let hasLocalRuntime = false;
  if (process.platform === 'win32') {
    try { await access(localRuntime, constants.X_OK); hasLocalRuntime = true; } catch { /* use the installed supported runtime */ }
  }
  const windowsBootstrap=resolve(root,'packages/dev-cli/bin/windows-bootstrap.cjs');
  const windowsHttp=pathToFileURL(resolve(root,'packages/dev-cli/bin/windows-http.mjs')).href;
  const selectedRuntime=hasLocalRuntime?localRuntime:process.execPath;
  if (process.platform==='win32'&&(!process.execArgv.includes('--jitless')||realpathSync(process.execPath).toLowerCase()!==realpathSync(selectedRuntime).toLowerCase())) {
    console.info(hasLocalRuntime?'Using the project-local Node 22 LTS runtime in Windows compatibility mode.':'Using Windows-compatible Node runtime mode.');
    const pathKey = Object.keys(process.env).find(key => key.toLowerCase() === 'path') || 'PATH';
    const runtimeEnv = { ...process.env, [pathKey]: `${dirname(selectedRuntime)}${delimiter}${process.env[pathKey] || ''}` };
    const launcher = spawn(selectedRuntime, ['--jitless','--no-lazy','--require',windowsBootstrap,'--import',windowsHttp,fileURLToPath(import.meta.url), ...args], { cwd: root, env: runtimeEnv, stdio: 'inherit', windowsHide: true });
    await new Promise((done, reject) => {
      launcher.once('error', () => reject(new Error('Could not start the local Node runtime.')));
      launcher.once('exit', (code, signal) => code === 0 ? done() : reject(new Error(`Development launcher stopped (${signal || `exit ${code}`}).`)));
    });
    return;
  }
  const apiEnv = { ...await environment('apps/api'), ...process.env };
  if (args[0] === 'demo') {
    const apiFolder = resolve(root, 'apps/api');
    const loader = pathToFileURL(createRequire(resolve(apiFolder, 'package.json')).resolve('tsx')).href;
    const child = spawn(process.execPath, [...(process.platform === 'win32' ? ['--jitless','--no-lazy','--require',windowsBootstrap,'--import',windowsHttp] : []), '--import', loader, 'src/seed-walkthrough.ts'], { cwd: apiFolder, env: apiEnv, stdio: 'inherit', windowsHide: true });
    await new Promise((done, reject) => {
      child.once('error', () => reject(new Error('Could not start the walkthrough seed.')));
      child.once('exit', code => code === 0 ? done() : reject(new Error('Walkthrough seed failed. See the preceding message.')));
    });
    return;
  }
  const mobileEnv = { ...await environment('apps/mobile'), ...process.env };
  const settings = connectionSettings(apiEnv, mobileEnv, networkInterfaces());
  if (args.includes('--check')) { console.info(`Configuration ready. Phone API: ${settings.apiUrl}. MongoDB URL is configured (not displayed).`); return; }
  await available(settings.port); await available(8081);
  const apiFolder = resolve(root, 'apps/api');
  const mobileFolder = resolve(root, 'apps/mobile');
  const apiRequire = createRequire(resolve(apiFolder, 'package.json'));
  const mobileRequire = createRequire(resolve(mobileFolder, 'package.json'));
  const tsxLoader = pathToFileURL(apiRequire.resolve('tsx')).href;
  // Avoid Windows V8 JIT crashes; the HTTP preload keeps AI/audio usable without WASM.
  const backendRuntime = [...(process.platform === 'win32' ? ['--jitless','--no-lazy','--require',windowsBootstrap,'--import',windowsHttp] : []), '--import', tsxLoader];
  const expo = resolve(dirname(mobileRequire.resolve('expo/package.json')), 'bin/cli');
  const children = new Set();
  let stopping = false;
  const start = (argv, cwd, env) => {
    const child = spawn(process.execPath, argv, { cwd, env, stdio: ['inherit','inherit','pipe'], windowsHide: true });
    child.nativeFailure=false;
    child.stderr.on('data',chunk=>{if(/Fatal error|V8_Fatal|Assertion failed|unreachable code|Check failed/.test(chunk.toString()))child.nativeFailure=true;process.stderr.write(chunk);});
    children.add(child);
    child.once('exit', () => children.delete(child));
    return child;
  };
  async function stop() {
    if (stopping) return;
    stopping = true;
    await Promise.all([...children].map((child) => new Promise((done) => {
      if (child.exitCode !== null) { done(); return; }
      if (process.platform === 'win32') {
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
        killer.once('exit', done); killer.once('error', done);
      } else { child.kill('SIGTERM'); child.once('exit', done); }
    })));
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stop().then(() => process.exit(0)); });
  try {
    const backendEnv = { ...apiEnv, WEB_ORIGINS: settings.origins, TSX_DISABLE_CACHE:'1', NODE_DISABLE_COMPILE_CACHE:'1' };
    console.info('Connecting to your MongoDB and applying database setup…');
    for(let attempt=0;attempt<3;attempt++){
      const setup = start([...backendRuntime, apiEnv.DEMO_MODE === 'false' ? 'src/migrate.ts' : 'src/seed.ts'], apiFolder, backendEnv);
      const outcome=await new Promise((done,reject)=>{setup.once('error',()=>reject(new Error('Could not start database setup. Run npm install first.')));setup.once('exit',(code,signal)=>done({code,signal}));});
      if(outcome.code===0)break;
      if(attempt<2&&nativeStartupCrash(outcome.code,outcome.signal,setup.nativeFailure)){console.info(`Native setup process crashed; retrying safely (${attempt+2}/3)…`);continue;}
      throw new Error(`Database setup stopped (${outcome.signal||`exit ${outcome.code}`}). A native runtime crash does not mean MongoDB credentials are wrong.`);
    }
    let api;
    let ready = false;
    for(let launch=0;launch<3&&!ready;launch++){
      api=start([...backendRuntime,'src/server.ts'],apiFolder,backendEnv);
      for (let attempt = 0; attempt < 60; attempt++) {
        if(api.exitCode!==null||api.signalCode)break;
        try { const health = await fetch(`http://127.0.0.1:${settings.port}/health`, { signal: AbortSignal.timeout(1000) }); if (health.ok) { ready = true; break; } } catch { /* bounded startup retry */ }
        await new Promise((done) => setTimeout(done, 250));
      }
      if(!ready){if(launch<2&&nativeStartupCrash(api.exitCode,api.signalCode,api.nativeFailure)){console.info(`Native API process crashed; retrying (${launch+2}/3)…`);continue;}throw new Error('The API could not start. Check its message above.');}
    }
    if (!ready) throw new Error('The API did not become ready. Check MongoDB connectivity.');
    console.info(`Phone API: ${settings.apiUrl}\nScan the Expo QR code below. Keep your phone and laptop on the same Wi-Fi.\nPress Ctrl+C to stop both servers.`);
    const frontendEnv = { ...mobileEnv, EXPO_PUBLIC_AUTH_RESET: args.includes('--clear') ? String(Date.now()) : '', EXPO_PUBLIC_API_URL: settings.apiUrl, EXPO_PUBLIC_WEB_API_URL: settings.webApiUrl, REACT_NATIVE_PACKAGER_HOSTNAME: new URL(settings.apiUrl).hostname };
    delete frontendEnv.MONGODB_URI;
    const frontend = start([expo, 'start', '--go', '--lan', '--port', '8081', ...(args.includes('--clear') ? ['--clear'] : [])], mobileFolder, frontendEnv);
    await new Promise((done, reject) => {
      frontend.once('error', () => reject(new Error('Could not start Expo. Run npm install first.')));
      frontend.once('exit', (code) => code === 0 ? done() : reject(new Error('Expo stopped with an error. Check its message above.')));
      api.once('exit', () => { if (!stopping) reject(new Error('The API stopped. Restart with npx run dev.')); });
    });
  } finally { await stop(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
