import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {bookingRouter} from '../src/booking-routes.js';

test('a rejected push never changes the accepted booking response and duplicates do not notify',async()=>{
 const booking={requestId:'fb716e15-3a44-4d11-8077-a34d576ceff2',clientName:'Mira',phone:'060123456',serviceName:'Šišanje',date:'2026-11-15',time:'11:30',duration:30,note:''};let notified=0,duplicate=false;
 const queue={redis:async()=>null,submit:async()=>({requestId:booking.requestId,duplicate}),pending:async()=>[],acknowledge:async()=>({ok:true}),authenticate:async()=>{}};
 const app=express();app.use(express.json());app.use('/api/booking',bookingRouter(queue,{notify:async()=>{notified++;throw new Error('push offline');},publicKey:async()=>({}),subscribe:async()=>({})}));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 try{const base=`http://127.0.0.1:${server.address().port}`;let response=await fetch(base+'/api/booking/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId:'a'.repeat(24),booking})});assert.equal(response.status,202);assert.equal((await response.json()).duplicate,false);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(notified,1);
  duplicate=true;response=await fetch(base+'/api/booking/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId:'a'.repeat(24),booking})});assert.equal(response.status,202);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(notified,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
