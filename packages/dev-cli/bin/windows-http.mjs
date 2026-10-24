// --jitless avoids this laptop's V8 compiler crashes, but disables WebAssembly.
// Node's built-in HTTP fetch parser requires WASM. Use node-fetch's node:http
// transport for Windows launcher/backend processes only; Expo is unaffected.
// Resolve after the CommonJS bootstrap, before linking the application's ESM graph.
const {default:fetch,Headers,Request,Response,FormData,Blob,File}=await import('node-fetch');
const {Readable}=await import('node:stream');

export async function windowsFetch(input,init){
  const response=await fetch(input,init);
  const body=response.body;
  // Existing bounded AI readers and the Google SDK consume a web-style reader.
  // Keep node-fetch's underlying stream intact for text/json/clone operations.
  if(body&&!body.getReader){
    let stream;
    Object.defineProperty(body,'getReader',{value:()=>{
      stream??=Readable.toWeb(body);
      return stream.getReader();
    }});
  }
  return response;
}

// Defining directly avoids invoking Node's lazy web-global setters, which would
// initialize the built-in WASM HTTP parser even though fetch is being replaced.
for(const [name,value] of Object.entries({fetch:windowsFetch,Headers,Request,Response,FormData,Blob,File})){
  delete globalThis[name];
  Object.defineProperty(globalThis,name,{value,writable:true,configurable:true});
}
