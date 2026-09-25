// V43.2.1: REST client. The site ID is public; this token exists ONLY on the manager.
const shortPattern=/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{2}$/;
export const validPairingCode=value=>typeof value==='string'&&shortPattern.test(value);
export function validApiOrigin(value){
 let url;try{url=new URL(value);}catch{throw new Error('Unesi adresu Booking API servera.');}
 const local=url.hostname==='localhost'||url.hostname==='127.0.0.1';
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/' || (url.protocol!=='https:'&&!(local&&url.protocol==='http:')))
  throw new Error('API adresa mora biti HTTPS origin bez putanje (osim lokalnog test servera).');
 return url.origin;
}
const text=(value,max)=>String(value??'').trim().slice(0,max);
export function validSiteProfile(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const business=raw.business&&typeof raw.business==='object'&&!Array.isArray(raw.business)?raw.business:{};
 const name=text(business.name,100),services=Array.isArray(raw.services)?raw.services:[];
 if(!name||!services.length||services.length>60)return null;
 const used=new Set(),normalized=[];
 for(const service of services){
  const id=text(service?.id,120),serviceName=text(service?.name,100);
  if(!/^[A-Za-z0-9:_-]{2,120}$/.test(id)||!serviceName||used.has(id))return null;
  used.add(id);normalized.push({id,name:serviceName});
 }
 return {version:1,business:{name,phone:text(business.phone,35),email:text(business.email,160),city:text(business.city,80),address:text(business.address,180),hours:text(business.hours,140)},services:normalized};
}
const sameName=(a,b)=>String(a||'').toLocaleLowerCase('sr').trim()===String(b||'').toLocaleLowerCase('sr').trim();
// Preserve local schedule and all existing bookings. Re-pairing updates only
// source-owned business metadata and merges services by stable source ID.
export function applySiteProfile(profile,raw){
 const siteProfile=validSiteProfile(raw);if(!siteProfile)throw new Error('Server nije vratio ispravan Booking profil sajta.');
 profile.siteProfile=siteProfile;profile.name=siteProfile.business.name;
 for(const incoming of siteProfile.services){
  let service=(profile.services||[]).find(item=>item.siteServiceId===incoming.id);
  if(!service)service=(profile.services||[]).find(item=>!item.siteServiceId&&sameName(item.name,incoming.name));
  if(service){service.siteServiceId=incoming.id;service.name=incoming.name;}
  else profile.services.push({id:globalThis.crypto?.randomUUID?.()||`site-${incoming.id}`,siteServiceId:incoming.id,name:incoming.name,duration:60,units:1});
 }
 return siteProfile;
}
async function request(origin,path,{method='GET',token,body,fetcher=fetch}={}){
 const response=await fetcher(`${validApiOrigin(origin)}/api/booking${path}`,{
  method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(12000)
 });
 let result;try{result=await response.json();}catch{throw new Error('Server nije vratio očekivani odgovor.');}
 if(!response.ok)throw new Error(result?.error||`Server greška (${response.status}).`);
 return result;
}
export async function claimPairing(apiOrigin,pairingCode,{fetcher}={}){
 if(!validPairingCode(pairingCode))throw new Error('Neispravan kratki kod.');
 const result=await request(apiOrigin,'/pairings/claim',{method:'POST',body:{pairingCode},fetcher});
 if(!/^[A-Za-z0-9_-]{24}$/.test(result.siteId||'')||!/^[A-Za-z0-9_-]{43}$/.test(result.accessToken||''))throw new Error('Server nije vratio validne pristupne podatke.');
 const profile=result.profile==null?null:validSiteProfile(result.profile);
 if(result.profile!=null&&!profile)throw new Error('Server nije vratio ispravan Booking profil sajta.');
 return {siteId:result.siteId,accessToken:result.accessToken,profile};
}
export async function getPushPublicKey(connection,{fetcher}={}){
 const result=await request(connection.apiOrigin,`/push/public-key/${connection.siteId}`,{token:connection.accessToken,fetcher});
 const key=text(result?.publicKey,160);if(!key)throw new Error('Server nije vratio VAPID javni ključ.');
 return key;
}
export async function subscribePush(connection,subscription,{fetcher}={}){
 return request(connection.apiOrigin,`/push/subscriptions/${connection.siteId}`,{method:'POST',token:connection.accessToken,body:{subscription},fetcher});
}
export async function pullInbox({connection,profile,bookings,save,normalize,fetcher}){
 const {apiOrigin,siteId,accessToken}=connection;
 if(!/^[A-Za-z0-9_-]{24}$/.test(siteId||'')||!/^[A-Za-z0-9_-]{43}$/.test(accessToken||''))throw new Error('Neispravno lokalno povezivanje.');
 const result=await request(apiOrigin,`/requests/${siteId}`,{token:accessToken,fetcher});
 if(!Array.isArray(result.requests)||result.requests.length>250)throw new Error('Server je vratio neispravno sanduče.');
 let added=0;
 for(const r of result.requests){
  if(!r||typeof r.requestId!=='string'||!/^[0-9a-f-]{36}$/i.test(r.requestId))throw new Error('Neispravan ID zahteva.');
  const existing=bookings.find(b=>b.sourceSiteId===siteId&&b.sourceRequestId===r.requestId);
  if(!existing){
   const service=(r.serviceId&&profile.services.find(s=>s.siteServiceId===r.serviceId))||profile.services.find(s=>sameName(s.name,r.serviceName));
   if(!service)throw new Error(`Usluga „${String(r.serviceName||'').slice(0,50)}” nije podešena u firmi „${profile.name}”. Zahtev ostaje na serveru.`);
   // Never acknowledge a malformed request. The business can adjust its service list.
   const candidate=normalize({serviceId:service.id,clientName:r.clientName,phone:r.phone,date:r.date,time:r.time,
      notes:r.note||'',units:service.units,source:'site-queue'},profile);
   candidate.sourceSiteId=siteId;candidate.sourceRequestId=r.requestId;
   bookings.push(candidate);
   try{await save();}catch(e){bookings.splice(bookings.indexOf(candidate),1);throw e;}
   added++;
  }
  // ACK after durable save; existing ID is already present in local data.
  await request(apiOrigin,`/requests/${siteId}/${r.requestId}/ack`,{method:'POST',token:accessToken,fetcher});
 }
 return added;
}
