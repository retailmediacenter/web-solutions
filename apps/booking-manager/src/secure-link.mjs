// V43.2 pilot: client-side encryption; Render only serves static files.
// PRIVATE KEY never belongs in a generated public website or URL.
const c=globalThis.crypto;
const encoder=new TextEncoder(),decoder=new TextDecoder();
const b64=bytes=>{let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const unb64=str=>{if(typeof str!=='string'||str.length>20000||!/^[a-zA-Z0-9_-]+$/.test(str))throw new Error('Neispravan prenosni kod.');const x=atob(str.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(x,cc=>cc.charCodeAt(0));};
const pack=x=>b64(encoder.encode(JSON.stringify(x)));
const unpack=x=>JSON.parse(decoder.decode(unb64(x)));
export async function createPairing(profileId){
 const kp=await c.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
 const publicKey=b64(await c.subtle.exportKey('spki',kp.publicKey));
 const privateJwk=await c.subtle.exportKey('jwk',kp.privateKey);
 return {privateJwk,publicToken:'RMCB1.'+pack({v:1,p:profileId,k:publicKey})};
}
export function decodePairing(token){
 if(typeof token!=='string'||token.length>2000||!token.startsWith('RMCB1.'))throw new Error('Neispravan kod za povezivanje.');
 const obj=unpack(token.slice(6));
 if(obj?.v!==1||typeof obj.p!=='string'||!obj.p||obj.p.length>100||typeof obj.k!=='string'||obj.k.length>750)throw new Error('Nepodržan kod za povezivanje.');
 return obj;
}
export async function makeEncryptedLink(payload,token,origin='https://rmc-booking-manager.onrender.com/'){
 const pair=decodePairing(token),pub=await c.subtle.importKey('spki',unb64(pair.k),{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
 const key=await c.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);
 const raw=await c.subtle.exportKey('raw',key),iv=c.getRandomValues(new Uint8Array(12));
 const content=encoder.encode(JSON.stringify(payload));if(content.length>2200)throw new Error('Previše podataka u zahtevu.');
 const [ek,ct]=await Promise.all([c.subtle.encrypt({name:'RSA-OAEP'},pub,raw),c.subtle.encrypt({name:'AES-GCM',iv},key,content)]);
 const u=new URL(origin);if(u.protocol!=='https:')throw new Error('Booking Manager zahteva HTTPS.');
 u.hash='rmb=B1.'+pack({p:pair.p,ek:b64(ek),iv:b64(iv),ct:b64(ct)});
 return u.href;
}
export function extractEnvelope(text){
 if(typeof text!=='string'||text.length>14000)throw new Error('Predugačak link.');
 const m=text.match(/(?:#rmb=|\brmb=)(B1\.[a-zA-Z0-9_-]+)/)||text.match(/^(B1\.[a-zA-Z0-9_-]+)$/);
 if(!m)throw new Error('Link ne sadrži RMC rezervaciju.');
 const token=m[1];if(token.length>10000)throw new Error('Link je predugačak.');
 const env=unpack(token.slice(3));
 if(typeof env?.p!=='string'||!env.p||typeof env.ek!=='string'||typeof env.iv!=='string'||typeof env.ct!=='string')throw new Error('Neispravan zahtev.');
 return env;
}
export async function openEncryptedLink(raw,profiles){
 const env=extractEnvelope(raw);
 const p=profiles.find(x=>x.id===env.p && x.pairing?.privateJwk);
 if(!p)throw new Error('Ovaj browser nema ključ odgovarajuće firme. Otvori instalirani Manager i tamo uvezi link.');
 try{
  const privateKey=await c.subtle.importKey('jwk',p.pairing.privateJwk,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);
  const bytes=await c.subtle.decrypt({name:'RSA-OAEP'},privateKey,unb64(env.ek));
  const key=await c.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['decrypt']);
  const json=await c.subtle.decrypt({name:'AES-GCM',iv:unb64(env.iv)},key,unb64(env.ct));
  const payload=JSON.parse(decoder.decode(json));
  if(payload?.v!==1||typeof payload.requestId!=='string'||!/^[a-z0-9-]{16,70}$/i.test(payload.requestId)||typeof payload.serviceName!=='string'||typeof payload.clientName!=='string'||typeof payload.phone!=='string'||typeof payload.date!=='string'||typeof payload.time!=='string')throw new Error('Nepotpuni podaci rezervacije.');
  return {profile:p,payload};
 }catch(e){throw new Error('Zahtev nije moguće dešifrovati na ovom uređaju ('+(e?.name||'format')+').');}
}
