/* eslint-disable @typescript-eslint/no-require-imports -- Must run before linking any ESM node:http import. */
// Recent Node 22 exposes lazy web-socket getters on node:http. ESM enumeration
// eagerly reads them, loading Undici's WASM parser even when fetch is replaced.
// Built-in web sockets are unavailable without WASM, so skip those optional
// getters in this process. Masar sockets use the existing Socket.IO/ws stack.
if(process.execArgv.includes('--jitless')){
  const http=require('node:http');
  for(const name of ['WebSocket','CloseEvent','MessageEvent']){
    const descriptor=Object.getOwnPropertyDescriptor(http,name);
    if(descriptor?.get&&descriptor.configurable)Object.defineProperty(http,name,{value:undefined,writable:true,enumerable:true,configurable:true});
  }
}
/* global process, require */

