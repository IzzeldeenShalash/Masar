import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {eraseRecordingFile} from '../src/features/stage8/recording-lifecycle';

test('recorder cleanup survives repeated close/unmount and file deletion failure',async()=>{
  const file={current:'file:///temporary-recording.m4a' as string|null};
  const removed:string[]=[];
  await eraseRecordingFile(file,async uri=>{removed.push(uri);throw new Error('Already removed');});
  await eraseRecordingFile(file,async uri=>{removed.push(uri);});
  assert.deepEqual(removed,['file:///temporary-recording.m4a']);
  assert.equal(file.current,null);
});

test('voice JSX does not render raw inline text or spaces inside native layout elements',()=>{
  const source=readFileSync(new URL('../src/features/stage8/VoiceRecorder.tsx',import.meta.url),'utf8');
  const tree=ts.createSourceFile('VoiceRecorder.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const violations:string[]=[];
  function inspect(node:ts.Node){
    if(ts.isJsxElement(node)&&['Card','View','Entrance'].includes(node.openingElement.tagName.getText(tree))){
      for(const child of node.children)if(ts.isJsxText(child)&&child.text&&!/[\r\n]/.test(child.text))violations.push(JSON.stringify(child.text));
    }
    ts.forEachChild(node,inspect);
  }
  inspect(tree);
  assert.deepEqual(violations,[],'Native layouts require a Text/Txt wrapper, even for inline spaces.');
});
