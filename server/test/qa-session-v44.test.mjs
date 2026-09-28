import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {qaRouter} from '../src/qa-routes.js';
import {scenarios} from '../../scripts/publication/scenarios.mjs';
const VALID='S'.repeat(48);
const QA_ORIGIN='https://retailmediacenter.github.io';
const restore=(before)=>{
 for(const [name,value] of Object.entries(before)){
  if(value==null)delete process.env[name];else process.env[name]=value;
 }
};
async function serveRouter(router){
 const app=express();app.use(express.json());app.use('/api/qa',router);
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 return {base:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}
const send=(base,endpoint,{key=null,origin=null,method='POST'}={})=>fetch(base+'/api/qa'+endpoint,{
 method,headers:{...(key?{Authorization:'Bearer '+key}:{}),...(origin?{Origin:origin}:{})}
});
test('B4 staging session issues existing QA SITE ID without sending secret to Preview',async()=>{
 const before={RMC_QA_MODE:process.env.RMC_QA_MODE,RMC_QA_ADMIN_KEY:process.env.RMC_QA_ADMIN_KEY,NODE_ENV:process.env.NODE_ENV};
 process.env.RMC_QA_MODE='1';process.env.RMC_QA_ADMIN_KEY=VALID;
 process.env.NODE_ENV='production';
 let time=Date.parse('2026-09-27T12:00:00Z'),issues=0;
 const server=await serveRouter(qaRouter({issue:async(_profile,options)=>{
  issues++;return {siteId:options.siteId,pairingCode:'ABCD-EFGH-23',expiresIn:1800};
 }},{now:()=>time}));
 try{
  let r=await send(server.base,'/pairing/frizer',{origin:QA_ORIGIN});assert.equal(r.status,403);
  r=await send(server.base,'/session',{key:'wrong',origin:QA_ORIGIN});assert.equal(r.status,403);
  r=await send(server.base,'/session',{key:VALID,origin:'https://attacker.example'});assert.equal(r.status,403);
  r=await send(server.base,'/session',{key:VALID,origin:QA_ORIGIN});assert.equal(r.status,201);
  assert.equal(r.headers.get('cache-control'),'no-store');
  const login=await r.json();
  assert.match(login.sessionToken,/^q_[A-Za-z0-9_-]{43}$/);
  assert.notEqual(login.sessionToken,VALID);
  assert.ok(!JSON.stringify(login).includes(VALID));
  r=await send(server.base,'/pairing/frizer',{key:VALID,origin:QA_ORIGIN});assert.equal(r.status,403);
  r=await send(server.base,'/pairing/minimarket',{key:login.sessionToken,origin:QA_ORIGIN});assert.equal(r.status,201);
  r=await send(server.base,'/pairing/frizer',{key:login.sessionToken,origin:QA_ORIGIN});assert.equal(r.status,201);
  const pair=await r.json();assert.equal(pair.siteId,scenarios.find(x=>x.slug==='frizer').siteId);
  assert.equal(issues,2);
  r=await send(server.base,'/pairing/frizer',{key:login.sessionToken,origin:'https://attacker.example'});assert.equal(r.status,403);
  r=await send(server.base,'/session',{key:login.sessionToken,origin:QA_ORIGIN,method:'DELETE'});assert.equal(r.status,204);
  r=await send(server.base,'/pairing/frizer',{key:login.sessionToken,origin:QA_ORIGIN});assert.equal(r.status,403);
  r=await send(server.base,'/session',{key:VALID});assert.equal(r.status,201);
  const second=(await r.json()).sessionToken;
  time+=4*60*60*1000+1;
  r=await send(server.base,'/pairing/frizer',{key:second,origin:QA_ORIGIN});assert.equal(r.status,403);
  r=await send(server.base,'/pairing/frizer',{key:VALID});assert.equal(r.status,201); // private legacy CLI only
  process.env.RMC_QA_MODE='0';
  r=await send(server.base,'/session',{key:VALID});assert.equal(r.status,404);
 }finally{await server.close();restore(before);}
});

test('B4 wrong QA key throttled and never issues code',async()=>{
 const before={RMC_QA_MODE:process.env.RMC_QA_MODE,RMC_QA_ADMIN_KEY:process.env.RMC_QA_ADMIN_KEY};
 process.env.RMC_QA_MODE='1';process.env.RMC_QA_ADMIN_KEY=VALID;
 const server=await serveRouter(qaRouter({issue:async()=>{throw Error('must not issue')}}));
 try{
  for(let i=0;i<5;i++)assert.equal((await send(server.base,'/session',{key:'wrong'+i,origin:QA_ORIGIN})).status,403);
  assert.equal((await send(server.base,'/session',{key:VALID,origin:QA_ORIGIN})).status,429);
 }finally{await server.close();restore(before);}
});

test('B4 public build uses protected QA controls without exposing administrator key',async()=>{
 const {readFileSync}=await import('node:fs');
 const url=new URL('../../scripts/publication/',import.meta.url);
 const build=readFileSync(new URL('build.mjs',url),'utf8');
 const client=readFileSync(new URL('qa-console.js',url),'utf8');
 assert.ok(build.includes('writeQaConsole(prev,manifest)'));
 assert.ok(build.includes('id="qa-password"'));
 assert.ok(build.includes('qa-console.js'));
 assert.ok(build.includes("target=\\\"_blank\\\" rel=\\\"noopener noreferrer\\\"")||build.includes('target="_blank" rel="noopener noreferrer"'));
 assert.ok(!client.includes('RMC_QA_ADMIN_KEY'));
 assert.ok(client.includes('sessionStorage'));
 assert.ok(client.includes("credentials:'omit'"));
});
