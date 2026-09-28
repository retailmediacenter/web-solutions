import {createECDH,createPrivateKey,createSign,createHash,hkdfSync,randomBytes,createCipheriv} from 'node:crypto';

// Shared transport contract: only BOOKING is emitted in V43.3. ORDER and
// INQUIRY reserve stable message types for the future combined manager.
export const NOTIFICATION_TYPES=Object.freeze({BOOKING:'BOOKING',ORDER:'ORDER',INQUIRY:'INQUIRY'});
const PREFIX='rmc:booking:v1:';
const key=(...parts)=>PREFIX+parts.join(':');
const b64url=value=>Buffer.from(value).toString('base64url');
const fromB64url=value=>Buffer.from(value,'base64url');
const err=(status,message)=>Object.assign(new Error(message),{status});
const text=(value,max)=>String(value??'').trim().slice(0,max);
const validSiteId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{24}$/.test(value);

export function validSubscription(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const endpoint=text(raw.endpoint,2048),p256dh=text(raw.keys?.p256dh,160),auth=text(raw.keys?.auth,80);
 if(!/^https:\/\//.test(endpoint)||!p256dh||!auth)return null;
 try{const point=fromB64url(p256dh),secret=fromB64url(auth);if(point.length!==65||point[0]!==4||secret.length<16||secret.length>32)return null;}catch{return null;}
 return {endpoint,keys:{p256dh,auth}};
}
const subscriptionId=sub=>createHash('sha256').update(sub.endpoint).digest('base64url').slice(0,32);

function vapidConfig(env=process.env){
 const subject=text(env.VAPID_SUBJECT,200),publicKey=text(env.VAPID_PUBLIC_KEY,160),privateKey=env.VAPID_PRIVATE_KEY;
 if(!subject||!publicKey||!privateKey)return null;
 if(!/^mailto:|^https:\/\//.test(subject))throw new Error('VAPID_SUBJECT mora biti mailto: ili HTTPS adresa.');
 const point=fromB64url(publicKey);if(point.length!==65||point[0]!==4)throw new Error('VAPID_PUBLIC_KEY nije P-256 javni ključ.');
 return {subject,publicKey,privateKey};
}
function jwtFor(endpoint,config){
 const audience=new URL(endpoint).origin,header=b64url(JSON.stringify({typ:'JWT',alg:'ES256'}));
 const claims=b64url(JSON.stringify({aud:audience,exp:Math.floor(Date.now()/1000)+12*60*60,sub:config.subject}));
 const signer=createSign('SHA256');signer.update(`${header}.${claims}`);signer.end();
 return `${header}.${claims}.${signer.sign({key:createPrivateKey(config.privateKey),dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
}
// RFC 8291 aes128gcm payload encryption. Kept here to avoid bundling a second
// dependency into the generator; only the Manager receives subscriptions.
export function encryptPayload(subscription,payload){
 const userPublic=fromB64url(subscription.keys.p256dh),auth=fromB64url(subscription.keys.auth),sender=createECDH('prime256v1');sender.generateKeys();
 const shared=sender.computeSecret(userPublic),senderPublic=sender.getPublicKey();
 const info=Buffer.concat([Buffer.from('WebPush: info\0'),userPublic,senderPublic]);
 const ikm=hkdfSync('sha256',shared,auth,info,32),salt=randomBytes(16);
 const cek=hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16);
 const nonce=hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12);
 const cipher=createCipheriv('aes-128-gcm',cek,nonce);const body=Buffer.concat([cipher.update(Buffer.concat([Buffer.from(JSON.stringify(payload)),Buffer.from([2])])),cipher.final(),cipher.getAuthTag()]);
 const header=Buffer.concat([salt,Buffer.from([0,0,16,0,65]),senderPublic]);
 return Buffer.concat([header,body]);
}

export function createPushNotifications(redis,env=process.env,{fetcher=fetch}={}){
 const config=vapidConfig(env);
 async function subscribe(siteId,accessToken,subscription,authenticate){
  if(!validSiteId(siteId))throw err(400,'Neispravan identifikator sajta.');
  await authenticate(siteId,accessToken);
  if(!config)throw err(503,'Push obaveštenja nisu konfigurisana.');
  const valid=validSubscription(subscription);if(!valid)throw err(400,'Pregledač nije vratio ispravnu Push pretplatu.');
  const storageKey=key('push',siteId,subscriptionId(valid));
  await redis('SET',storageKey,JSON.stringify(valid),'EX',180*24*60*60);
  await redis('SADD',key('push-index',siteId),storageKey);await redis('EXPIRE',key('push-index',siteId),180*24*60*60);
  return {ok:true};
 }
 async function publicKey(siteId,accessToken,authenticate){if(!validSiteId(siteId))throw err(400,'Neispravan identifikator sajta.');await authenticate(siteId,accessToken);if(!config)throw err(503,'Push obaveštenja nisu konfigurisana.');return {publicKey:config.publicKey};}
 async function notify(siteId,event){
  if(!config||![NOTIFICATION_TYPES.BOOKING,NOTIFICATION_TYPES.ORDER].includes(event?.type)||!validSiteId(siteId))return {sent:0};
  const ids=await redis('SMEMBERS',key('push-index',siteId));let sent=0;
  for(const storageKey of ids||[]){
   let subscription;try{subscription=validSubscription(JSON.parse(await redis('GET',storageKey)));}catch{};
   if(!subscription){await redis('DEL',storageKey);await redis('SREM',key('push-index',siteId),storageKey);continue;}
   try{const response=await fetcher(subscription.endpoint,{method:'POST',headers:{TTL:'86400','Content-Encoding':'aes128gcm',Authorization:`vapid t=${jwtFor(subscription.endpoint,config)}, k=${config.publicKey}`},body:encryptPayload(subscription,event),signal:AbortSignal.timeout(8000)});if(response.status===404||response.status===410){await redis('DEL',storageKey);await redis('SREM',key('push-index',siteId),storageKey);}else if(response.ok)sent++;}
   catch{/* Delivery failure is intentionally isolated from booking submission. */}
  }
  return {sent};
 }
 return {enabled:!!config,subscribe,publicKey,notify};
}
