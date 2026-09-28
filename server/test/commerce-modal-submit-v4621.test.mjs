import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runtime=readFileSync(path.join(repo,'client/public/export-runtime.js'),'utf8');
const modal=readFileSync(path.join(repo,'client/public/global-modal.js'),'utf8');

test('Commerce submit uses relocated global-modal footer button rather than searching inside the form',()=>{
  assert.match(modal,/submit\.setAttribute\('form','orderForm'\)/);
  assert.match(modal,/footer\.append\(group\)/);
  const start=runtime.indexOf("$('orderForm').addEventListener('submit'");
  const end=runtime.indexOf("const tastingForm=",start);
  assert.ok(start>=0 && end>start, 'Commerce form listener must exist');
  const listener=runtime.slice(start,end);
  assert.match(listener,/commerceSending=true;\$\('orderSubmit'\)\.disabled=true/);
  assert.match(listener,/finally\{commerceSending=false;\$\('orderSubmit'\)\.disabled=false;\}/);
  assert.doesNotMatch(listener,/form\.querySelector\(/);
});
