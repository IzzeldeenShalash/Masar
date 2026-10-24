import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectLanAddress, connectionSettings,nativeStartupCrash } from '../bin/run.mjs';
const interfaces = { 'vEthernet': [{ family: 'IPv4', address: '172.20.0.1', internal: false }], 'Wi-Fi': [{ family: 'IPv4', address: '192.168.1.50', internal: false }], loopback: [{ family: 'IPv4', address: '127.0.0.1', internal: true }] };
test('only native startup failures qualify for bounded restart',()=>{assert.equal(nativeStartupCrash(1,null),false);assert.equal(nativeStartupCrash(0,null),false);assert.equal(nativeStartupCrash(3221225477,null),true);assert.equal(nativeStartupCrash(1,null,true),true);assert.equal(nativeStartupCrash(null,'SIGSEGV'),true);assert.equal(nativeStartupCrash(null,'SIGTERM'),false);});
test('phone uses Wi-Fi LAN address and web keeps same-site localhost', () => {
  assert.equal(selectLanAddress(interfaces), '192.168.1.50');
  const result = connectionSettings({ MONGODB_URI: 'mongodb+srv://test.invalid/masar' }, {}, interfaces);
  assert.equal(result.apiUrl, 'http://192.168.1.50:3001');
  assert.equal(result.webApiUrl, 'http://localhost:3001');
  assert.match(result.origins, /http:\/\/192\.168\.1\.50:8081/);
});
test('explicit API address supports multiple network adapters', () => {
  assert.equal(connectionSettings({ MONGODB_URI: 'mongodb://test.invalid/masar', API_PORT: '4000' }, { EXPO_PUBLIC_API_URL: 'http://10.0.0.5:4000/' }, {}).apiUrl, 'http://10.0.0.5:4000');
});
test('missing MongoDB URL and phone localhost fail with actionable errors', () => {
  assert.throws(() => connectionSettings({}, {}, interfaces), /MONGODB_URI/);
  assert.throws(() => connectionSettings({ MONGODB_URI: 'mongodb://test.invalid' }, { EXPO_PUBLIC_API_URL: 'http://localhost:3001' }, interfaces), /LAN/);
  assert.throws(() => connectionSettings({ MONGODB_URI: 'mongodb://test.invalid', NODE_ENV: 'production' }, {}, interfaces), /development/);
  assert.throws(() => connectionSettings({ MONGODB_URI: 'mongodb://test.invalid', API_PORT: '8081' }, {}, interfaces), /API_PORT/);
});
