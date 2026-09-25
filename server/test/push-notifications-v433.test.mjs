import test from 'node:test';
import assert from 'node:assert/strict';
import {createECDH,generateKeyPairSync} from 'node:crypto';
import {createPushNotifications,NOTIFICATION_TYPES,encryptPayload,validSubscription} from '../src/push-notifications.js';

function redisMock(){const data=new Map(),sets=new Map();return async(cmd,...args)=>{if(cmd==='SET'){data.set(args[0],args[1]);return 'OK';}if(cmd==='GET')return data.get(args[0])||null;if(cmd==='DEL'){return Number(data.delete(args[0]));}if(cmd==='SADD'){const set=sets.get(args[0])||new Set();set.add(args[1]);sets.set(args[0],set);return 1;}if(cmd==='SMEMBERS')return [...(sets.get(args[0])||[])];if(cmd==='SREM'){return Number((sets.get(args[0])||new Set()).delete(args[1]));}if(cmd==='EXPIRE')return 1;throw new Error('Unknown Redis command '+cmd);};}
function config(){const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),ecdh=createECDH('prime256v1');ecdh.generateKeys();return {VAPID_SUBJECT:'mailto:test@example.invalid',VAPID_PUBLIC_KEY:ecdh.getPublicKey().toString('base64url'),VAPID_PRIVATE_KEY:pair.privateKey.export({type:'pkcs8',format:'pem'})};}
function subscription(){const ecdh=createECDH('prime256v1');ecdh.generateKeys();return {endpoint:'https://push.example.invalid/message/1',keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:Buffer.alloc(16,7).toString('base64url')}};}

test('validates browser subscriptions and encrypts the BOOKING payload',()=>{
 const sub=subscription();assert.deepEqual(validSubscription(sub),sub);assert.equal(validSubscription({endpoint:'http://bad',keys:{}}),null);
 const encrypted=encryptPayload(sub,{type:NOTIFICATION_TYPES.BOOKING,requestId:'test'});
 assert.ok(encrypted.length>100);assert.equal(encrypted.subarray(0,16).length,16);
});
test('subscription is site-bound and a failed push delivery stays isolated',async()=>{
 const redis=redisMock(),calls=[];const push=createPushNotifications(redis,config(),{fetcher:async(...args)=>{calls.push(args);throw new Error('offline');}});
 const siteId='a'.repeat(24),token='b'.repeat(43),auth=async(id,received)=>{assert.equal(id,siteId);assert.equal(received,token);};
 const sub=subscription();assert.deepEqual(await push.subscribe(siteId,token,sub,auth),{ok:true});
 const key=await push.publicKey(siteId,token,auth);assert.match(key.publicKey,/^[A-Za-z0-9_-]+$/);
 assert.deepEqual(await push.notify(siteId,{type:NOTIFICATION_TYPES.BOOKING,requestId:'r',title:'Nova',body:'Test'}),{sent:0});
 assert.equal(calls.length,1);assert.deepEqual(await push.notify(siteId,{type:NOTIFICATION_TYPES.ORDER}),{sent:0});
});
