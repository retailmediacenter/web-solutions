/* V46.2 public Commerce sender. No owner credentials, prices, or internal catalog in requests. */
(()=>{
 'use strict';
 function endpoint(transport){
  if(!transport||typeof transport.siteId!=='string'||!/^[A-Za-z0-9_-]{24}$/.test(transport.siteId))throw new Error('Sajt nema ispravan SITE ID.');
  let u;try{u=new URL(transport.apiBaseUrl);}catch{throw new Error('Adresa servisa za porudžbine nije ispravna.');}
  if(u.username||u.password||u.pathname!=='/'||u.search||u.hash||(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))))
   throw new Error('Adresa servisa za porudžbine nije ispravna.');
  return u.origin+'/api/commerce/orders';
 }
 async function send(transport,fields){
  const url=endpoint(transport);
  if(!globalThis.crypto?.randomUUID)throw new Error('Za slanje porudžbine otvorite sajt putem HTTPS-a.');
  const requestedId=String(fields.requestId||'').trim();
  const requestId=/^[0-9a-f-]{36}$/i.test(requestedId)?requestedId:crypto.randomUUID();
  const type=fields.type==='INQUIRY'?'INQUIRY':'ORDER';
  const order={requestId,type,clientName:String(fields.clientName||'').trim(),phone:String(fields.phone||'').trim(),
   note:String(fields.note||'').trim(),fulfillment:type==='INQUIRY'?'':fields.fulfillment,
   items:Array.isArray(fields.items)?fields.items.map(row=>({productId:String(row.productId||''),quantity:row.quantity,
    size:String(row.size||''),preparation:String(row.preparation||''),variant:String(row.variant||'')})):[]};
  if(!order.items.length||order.items.length>30)throw new Error('Izaberite od 1 do 30 proizvoda.');
  let response;
  try{response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({siteId:transport.siteId,order}),cache:'no-store',signal:AbortSignal.timeout(12000)});}
  catch{throw new Error('Nismo dobili potvrdu servera. Pokušajte ponovo istim zahtevom ili proverite sa prodavnicom.');}
  let result;try{result=await response.json();}catch{
   throw new Error('Server nije vratio potvrdu. Pokušajte ponovo istim zahtevom ili proverite sa prodavnicom.');
  }
  if(!response.ok)throw new Error(String(result?.error||'Server nije prihvatio zahtev.').slice(0,190));
  if(result?.requestId!==order.requestId||!/^[A-HJ-NP-Z2-9]{8}$/.test(result?.orderCode||''))
   throw new Error('Server nije vratio ispravnu potvrdu. Proverite sa prodavnicom pre novog zahteva.');
  return result;
 }
 window.RMCCommerceSubmit={send};
})();
