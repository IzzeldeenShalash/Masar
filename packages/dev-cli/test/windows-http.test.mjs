import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {windowsFetch} from '../bin/windows-http.mjs';

test('Windows HTTP handles JSON, bounded readers, multipart voice and cancellation without WASM',async()=>{
  const server=createServer(async(req,res)=>{
    if(req.url==='/slow')return;
    if(req.url==='/redirect'){res.writeHead(302,{Location:'/json'}).end();return;}
    if(req.url==='/voice'){
      let body='';for await(const chunk of req)body+=chunk.toString();
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({audio:body.includes('synthetic recording'),language:body.includes('ar')}));return;
    }
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ready:true}));
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const root=`http://127.0.0.1:${server.address().port}`;
  try{
    assert.deepEqual(await(await windowsFetch(root+'/json')).json(),{ready:true});
    const response=await windowsFetch(root+'/json');const reader=response.body.getReader();let text='';for(;;){const {done,value}=await reader.read();if(done)break;text+=Buffer.from(value).toString();}assert.equal(JSON.parse(text).ready,true);
    const form=new globalThis.FormData();form.append('file',new globalThis.Blob(['synthetic recording'],{type:'audio/wav'}),'test.wav');form.append('language','ar');
    assert.deepEqual(await(await windowsFetch(root+'/voice',{method:'POST',body:form})).json(),{audio:true,language:true});
    await assert.rejects(windowsFetch(root+'/redirect',{redirect:'error'}));
    await assert.rejects(windowsFetch(root+'/slow',{signal:AbortSignal.timeout(100)}),error=>error.name==='AbortError');
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
