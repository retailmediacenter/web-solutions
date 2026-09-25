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
 return {siteId:result.siteId,accessToken:result.accessToken};
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
   const service=profile.services.find(s=>s.name.toLocaleLowerCase('sr').trim()===String(r.serviceName||'').toLocaleLowerCase('sr').trim());
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
