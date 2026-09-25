/* V43.2.1 public booking request submission: no private manager credentials. */
(()=>{
 'use strict';
 function endpoint(transport){
   if(!transport||typeof transport.siteId!=='string'||!/^[A-Za-z0-9_-]{24}$/.test(transport.siteId))throw new Error('Sajt nema validno povezivanje sa Booking Managerom.');
   const u=new URL(transport.apiBaseUrl);
   const local=['localhost','127.0.0.1'].includes(u.hostname);
   if(u.username||u.password||u.pathname!=='/'||u.search||u.hash||(u.protocol!=='https:'&&!(local&&u.protocol==='http:')))
     throw new Error('Neispravna adresa servisa za rezervacije.');
   return u.origin+'/api/booking/requests';
 }
 async function send(transport,fields){
   const url=endpoint(transport);
   if(!crypto?.randomUUID)throw new Error('Za bezbedno slanje otvorite sajt putem HTTPS-a ili lokalnog servera.');
   const booking={requestId:crypto.randomUUID(),clientName:String(fields.clientName||'').trim(),phone:String(fields.phone||'').trim(),
     serviceName:String(fields.serviceName||'').trim(),date:fields.date,time:fields.time,duration:60,note:String(fields.note||'').slice(0,350)};
   const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId:transport.siteId,booking}),cache:'no-store',signal:AbortSignal.timeout(12000)});
   let result;try{result=await response.json();}catch{throw new Error('Server nije vratio potvrdu rezervacije. Proverite sa firmom pre ponovnog slanja.');}
   if(!response.ok)throw new Error(result?.error||'Server nije prihvatio rezervaciju.');
   if(result.requestId!==booking.requestId)throw new Error('Neispravna potvrda servera. Proverite sa firmom pre ponovnog slanja.');
   return result;
 }
 window.RMCBookingSubmit={send};
})();
