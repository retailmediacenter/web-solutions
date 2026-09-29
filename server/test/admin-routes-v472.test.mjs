import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {adminRouter} from '../src/admin-routes.js';

test('Project Registry admin requires a secret session and exposes only the safe project summary',async()=>{
 const oldKey=process.env.RMC_ADMIN_KEY,oldOrigin=process.env.CLIENT_ORIGIN;
 process.env.RMC_ADMIN_KEY='a'.repeat(40);process.env.CLIENT_ORIGIN='https://admin.example.test';
 const projects={summary:async siteId=>({siteId,business:{name:'Primer'},capabilities:{booking:true,commerce:false}}),activate:async(siteId,packageName)=>({siteId,package:packageName,pairingCode:'ABCD-EFGH-23',expiresIn:1800})};
 const app=express().use(express.json()).use('/api/admin',adminRouter(projects));
 const server=await new Promise(resolve=>{const listening=app.listen(0,()=>resolve(listening));});
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const denied=await fetch(base+'/api/admin/projects/AbCdEfGhIjKlMnOpQrStUvWx');assert.equal(denied.status,401);
  const session=await fetch(base+'/api/admin/session',{method:'POST',headers:{Authorization:'Bearer '+'a'.repeat(40)}});assert.equal(session.status,201);
  const {sessionToken}=await session.json();assert.match(sessionToken,/^a_/);
  const found=await fetch(base+'/api/admin/projects/AbCdEfGhIjKlMnOpQrStUvWx',{headers:{Authorization:`Bearer ${sessionToken}`}});assert.deepEqual((await found.json()).project.business,{name:'Primer'});
  const activation=await fetch(base+'/api/admin/projects/AbCdEfGhIjKlMnOpQrStUvWx/activate',{method:'POST',headers:{Authorization:`Bearer ${sessionToken}`,'Content-Type':'application/json'},body:JSON.stringify({package:'booking'})});assert.equal((await activation.json()).pairingCode,'ABCD-EFGH-23');
 }finally{await new Promise(resolve=>server.close(resolve));if(oldKey===undefined)delete process.env.RMC_ADMIN_KEY;else process.env.RMC_ADMIN_KEY=oldKey;if(oldOrigin===undefined)delete process.env.CLIENT_ORIGIN;else process.env.CLIENT_ORIGIN=oldOrigin;}
});
