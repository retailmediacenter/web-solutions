// V43.2 pairing code is PUBLIC; no private key may enter the generated site.
import {createPublicKey} from 'node:crypto';
export const DEFAULT_BOOKING_MANAGER_URL='https://rmc-booking-manager.onrender.com/';
export function resolveBookingPairing(token, env=process.env){
 const raw=String(token||'').trim();if(!raw)return null;
 if(raw.length>2000||!raw.startsWith('RMCB1.'))throw new Error('Unesi ispravan JAVNI kod iz Booking Managera.');
 let pair;try{pair=JSON.parse(Buffer.from(raw.slice(6),'base64url').toString('utf8'));}
 catch{throw new Error('Kod povezivanja nije ispravan.');}
 if(pair?.v!==1||typeof pair.p!=='string'||!pair.p||pair.p.length>100||typeof pair.k!=='string'||pair.k.length>750||!/^[A-Za-z0-9_-]+$/.test(pair.k)||Object.keys(pair).sort().join()!=='k,p,v')throw new Error('Neispravan javni kod povezivanja.');
 try{const pub=createPublicKey({key:Buffer.from(pair.k,'base64url'),format:'der',type:'spki'});
   if(pub.asymmetricKeyType!=='rsa'||(pub.asymmetricKeyDetails?.modulusLength||0)<2048)throw Error();}
 catch{throw new Error('Javni ključ u kodu nije ispravan.');}
 // Allow the manager to move hosting later without hard-coding its location in form data.
 let u;try{u=new URL(env.BOOKING_MANAGER_URL||DEFAULT_BOOKING_MANAGER_URL);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error();}
 catch{throw new Error('Booking Manager mora imati ispravnu HTTPS adresu.');}
 return {token:raw,url:u.href};
}
