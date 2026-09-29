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
 const commerce=raw.commerce?.enabled===true?raw.commerce:null;
 if(!name||services.length>60||(!services.length&&!commerce))return null;
 if(commerce){
  if(commerce.currency!=='RSD'||!Array.isArray(commerce.products)||!commerce.products.length||commerce.products.length>500)return null;
  if(commerce.products.some(p=>!p||!(/^[A-Za-z0-9:_-]{2,120}$/).test(p.id||'')||!p.name||!['kom','kg','par'].includes(p.unit)||!Number.isFinite(p.price)||p.price<0))return null;
 }
 const used=new Set(),normalized=[];
 for(const service of services){
  const id=text(service?.id,120),serviceName=text(service?.name,100);
  if(!/^[A-Za-z0-9:_-]{2,120}$/.test(id)||!serviceName||used.has(id))return null;
  used.add(id);normalized.push({id,name:serviceName});
 }
 return {version:commerce?2:1,business:{name,phone:text(business.phone,35),email:text(business.email,160),city:text(business.city,80),address:text(business.address,180),hours:text(business.hours,140)},services:normalized,...(commerce?{commerce:structuredClone(commerce)}:{})};
}
const sameName=(a,b)=>String(a||'').toLocaleLowerCase('sr').trim()===String(b||'').toLocaleLowerCase('sr').trim();
// Preserve local schedule and all existing bookings. Re-pairing updates only
// source-owned business metadata and merges services by stable source ID.
export function applySiteProfile(profile,raw){
 const siteProfile=validSiteProfile(raw);if(!siteProfile)throw new Error('Server nije vratio ispravan Booking profil sajta.');
 profile.siteProfile=siteProfile;profile.name=siteProfile.business.name;
 if(!Array.isArray(profile.services))profile.services=[];
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
 if(result.profile!=null&&!profile)throw new Error('Server nije vratio ispravan poslovni profil sajta.');
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
  if(r.reservationCode!=null&&(typeof r.reservationCode!=='string'||!/^[A-HJ-NP-Z2-9]{8}$/.test(r.reservationCode)))throw new Error('Neispravan rezervacioni kod.');
  const existing=bookings.find(b=>b.sourceSiteId===siteId&&b.sourceRequestId===r.requestId);
  if(!existing){
   const service=(r.serviceId&&profile.services.find(s=>s.siteServiceId===r.serviceId))||profile.services.find(s=>sameName(s.name,r.serviceName));
   if(!service)throw new Error(`Usluga „${String(r.serviceName||'').slice(0,50)}” nije podešena u firmi „${profile.name}”. Zahtev ostaje na serveru.`);
   // Never acknowledge a malformed request. The business can adjust its service list.
   const additional=Array.isArray(r.answers)?r.answers.filter(answer=>answer&&typeof answer.label==='string'&&typeof answer.value==='string').map(answer=>`${answer.label}: ${answer.value}`).join('; '):'';
   const candidate=normalize({serviceId:service.id,clientName:r.clientName,phone:r.phone,date:r.date,time:r.time,timingMode:r.timingMode,dayPart:r.dayPart,
      notes:[r.note,additional].filter(Boolean).join(additional&&r.note?'\n':'').slice(0,700),units:service.units,source:'site-queue'},profile);
   candidate.sourceSiteId=siteId;candidate.sourceRequestId=r.requestId;if(r.reservationCode)candidate.reservationCode=r.reservationCode;
   bookings.push(candidate);
   try{await save();}catch(e){bookings.splice(bookings.indexOf(candidate),1);throw e;}
   added++;
  }
  // ACK after durable save; existing ID is already present in local data.
  await request(apiOrigin,`/requests/${siteId}/${r.requestId}/ack`,{method:'POST',token:accessToken,fetcher});
 }
 return added;
}

// Server revocation is required before deleting the local token. Failure leaves access intact.
export async function disconnectRemote(connection,{fetcher}={}){
 if(!/^[A-Za-z0-9_-]{24}$/.test(connection?.siteId||'')||!/^[A-Za-z0-9_-]{43}$/.test(connection?.accessToken||''))throw new Error('Neispravno lokalno povezivanje.');
 return request(connection.apiOrigin,`/connections/${connection.siteId}`,{method:'DELETE',token:connection.accessToken,fetcher});
}

// V46.0: separate ORDER/INQUIRY inbox, identical SITE ID and owner token.
// The caller MUST provide IndexedDB-backed `save` that rejects on failure.
export async function pullOrderInbox({connection,profile,orders,save,normalize,fetcher}){
 const {apiOrigin,siteId,accessToken}=connection;
 if(!/^[A-Za-z0-9_-]{24}$/.test(siteId||'')||!/^[A-Za-z0-9_-]{43}$/.test(accessToken||''))throw new Error('Neispravno povezivanje.');
 // Booking's existing request() is unchanged; Commerce uses its own route.
 const commerceRequest=async(path,opts={})=>{
  const response=await (fetcher||fetch)(`${validApiOrigin(apiOrigin)}/api/commerce${path}`,{
   method:opts.method||'GET',headers:{Authorization:`Bearer ${accessToken}`},cache:'no-store',signal:AbortSignal.timeout(12000)});
  let result;try{result=await response.json();}catch{throw new Error('Commerce API nije vratio odgovor.');}
  if(!response.ok)throw new Error(result?.error||`Commerce greška (${response.status}).`);return result;
 };
 if(!Array.isArray(orders))throw new Error('Lokalna lista porudžbina nije inicijalizovana.');
 if(typeof save!=='function'||typeof normalize!=='function')throw new Error('Nedostaje bezbedno čuvanje porudžbina.');
 const result=await commerceRequest(`/orders/${siteId}`);
 if(!Array.isArray(result.orders)||result.orders.length>250)throw new Error('Commerce API je vratio neispravno sanduče.');
 let added=0;
 for(const incoming of result.orders){
  if(!incoming||typeof incoming.requestId!=='string'||!/^[0-9a-f-]{36}$/i.test(incoming.requestId))throw new Error('Neispravan ID porudžbine.');
  const existing=orders.find(item=>item.sourceSiteId===siteId&&item.sourceRequestId===incoming.requestId);
  if(!existing){
   const candidate=normalize(incoming,profile.id,siteId);
   orders.push(candidate);
   try{await save();}catch(error){orders.splice(orders.indexOf(candidate),1);throw error;}
   added++;
  }
  // ACK strictly after successful local save, or for an already saved request.
  await commerceRequest(`/orders/${siteId}/${incoming.requestId}/ack`,{method:'POST'});
 }
 return added;
}
