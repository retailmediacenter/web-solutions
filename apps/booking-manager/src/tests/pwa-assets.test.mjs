import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const publicUrl=new URL('../../public/',import.meta.url);
const pngSize=buffer=>({width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)});
test('PWA manifest references branded RMC icons',async()=>{
 const manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',publicUrl),'utf8'));
 assert.deepEqual(manifest.icons.map(icon=>icon.src),['./assets/icon-192.png','./assets/icon-512.png']);
 for(const [file,size] of [['assets/icon-192.png',192],['assets/icon-512.png',512],['assets/apple-touch-icon.png',180]]){
  const image=await readFile(new URL(file,publicUrl));
  assert.deepEqual(pngSize(image),{width:size,height:size});
 }
});
test('portal document includes Apple touch icon',async()=>{
 const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
 assert.match(html,/apple-touch-icon\.png/);
});
