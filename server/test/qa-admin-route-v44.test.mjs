import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {qaRouter} from '../src/qa-routes.js';
import {scenarios} from '../../scripts/publication/scenarios.mjs';

test('QA re-pair route is private, staging-only and uses pre-existing fixed public QA SITE ID',async()=>{
 const originalKey=process.env.RMC_QA_ADMIN_KEY,originalMode=process.env.RMC_QA_MODE;
 const key='r'.repeat(48);let issued=0,profile=null;
 process.env.RMC_QA_ADMIN_KEY=key;process.env.RMC_QA_MODE='1';
 const app=express();app.use('/api/qa',qaRouter({issue:async(p,{siteId})=>{
  issued++;profile=p;return {siteId,pairingCode:'ABCD-EFGH-23',expiresIn:1800};
 }}));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 try{
  const base=`http://127.0.0.1:${server.address().port}`;
  let res=await fetch(base+'/api/qa/pairing/frizer',{method:'POST'});
  assert.equal(res.status,403);assert.equal(issued,0);
  res=await fetch(base+'/api/qa/pairing/minimarket',{method:'POST',headers:{Authorization:`Bearer ${key}`}});
  assert.equal(res.status,404);assert.equal(issued,0);
  res=await fetch(base+'/api/qa/pairing/frizer',{method:'POST',headers:{Authorization:`Bearer ${key}`}});
  assert.equal(res.status,201);assert.equal(res.headers.get('cache-control'),'no-store');
  const data=await res.json();assert.equal(data.siteId,scenarios.find(s=>s.slug==='frizer').siteId);
  assert.equal(data.scenario,'frizer');assert.ok(profile.services?.length);assert.equal(issued,1);
  process.env.RMC_QA_MODE='0';
  res=await fetch(base+'/api/qa/pairing/frizer',{method:'POST',headers:{Authorization:`Bearer ${key}`}});
  assert.equal(res.status,404);assert.equal(issued,1);
 }finally{
  await new Promise(resolve=>server.close(resolve));
  if(originalKey==null)delete process.env.RMC_QA_ADMIN_KEY;else process.env.RMC_QA_ADMIN_KEY=originalKey;
  if(originalMode==null)delete process.env.RMC_QA_MODE;else process.env.RMC_QA_MODE=originalMode;
 }
});
