/* V46.0: Data-only Commerce model. The local IndexedDB snapshot is the
   authority after successful queue ingestion; Redis is NOT order history. */
export const ORDER_STATUS=Object.freeze({NEW:'new',ACCEPTED:'accepted',PREPARING:'preparing',READY:'ready',COMPLETED:'completed',DECLINED:'declined',CANCELLED:'cancelled',ANSWERED:'answered'});
export const ORDER_LABELS=Object.freeze({new:'Novo',accepted:'Prihvaćeno',preparing:'U pripremi',ready:'Spremno',completed:'Završeno',declined:'Odbijeno',cancelled:'Otkazano',answered:'Odgovoreno'});
const ALLOWED=Object.freeze({new:['accepted','declined','answered'],accepted:['preparing','cancelled'],preparing:['ready','cancelled'],ready:['completed','cancelled'],completed:[],declined:[],cancelled:[],answered:[]});
const idPattern=/^[0-9a-f-]{36}$/i,codePattern=/^[A-HJ-NP-Z2-9]{8}$/;
const copy=x=>JSON.parse(JSON.stringify(x));
export function normalizeIncomingOrder(raw,profileId,siteId){
 if(!raw||!idPattern.test(raw.requestId||'')||!codePattern.test(raw.orderCode||'')||!['ORDER','INQUIRY'].includes(raw.type)||!Array.isArray(raw.items)||!raw.items.length||raw.items.length>30)throw new Error('Server je vratio neispravnu porudžbinu.');
 if(typeof raw.clientName!=='string'||raw.clientName.length>100||typeof raw.phone!=='string'||raw.phone.length>35)throw new Error('Nedostaju podaci kupca.');
 let total=0;
 const items=raw.items.map(item=>{
  if(typeof item.productId!=='string'||typeof item.name!=='string'||!['kom','kg','par'].includes(item.unit)||!Number.isFinite(item.quantity)||item.quantity<=0||!Number.isFinite(item.unitPrice)||item.unitPrice<0||!Number.isFinite(item.lineTotal)||item.lineTotal<0)throw new Error('Porudžbina sadrži neispravan artikal.');
  total+=item.lineTotal;
  return {productId:item.productId,name:item.name.slice(0,100),image:String(item.image||'').slice(0,260),unit:item.unit,quantity:item.quantity,unitPrice:item.unitPrice,lineTotal:item.lineTotal,size:String(item.size||'').slice(0,12),preparation:String(item.preparation||'').slice(0,20),variant:String(item.variant||'').slice(0,110)};
 });
 if(!Number.isFinite(raw.total)||Math.abs(raw.total-total)>0.011||raw.currency!=='RSD'||raw.pricing!=='indicative')throw new Error('Iznos porudžbine nije usklađen sa stavkama.');
 return {id:globalThis.crypto?.randomUUID?.()||`ord-${Date.now()}-${Math.random().toString(36).slice(2)}`,profileId,sourceSiteId:siteId,sourceRequestId:raw.requestId,
  orderCode:raw.orderCode,type:raw.type,status:ORDER_STATUS.NEW,clientName:raw.clientName,phone:raw.phone,note:String(raw.note||'').slice(0,700),fulfillment:String(raw.fulfillment||'').slice(0,20),
  items,total:raw.total,currency:'RSD',pricing:'indicative',createdAt:raw.receivedAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
}
export function nextOrderStatus(order,next){
 if(!order||!Object.values(ORDER_STATUS).includes(next)||!ALLOWED[order.status]?.includes(next))throw new Error('Nedozvoljena promena statusa porudžbine.');
 if(order.type==='INQUIRY'&&!['answered','declined'].includes(next))throw new Error('Upit nije porudžbina.');
 if(order.type==='ORDER'&&next==='answered')throw new Error('Porudžbina ne može biti označena kao upit.');
 return {...copy(order),status:next,updatedAt:new Date().toISOString()};
}
export function orderReplyText(order,next){
 const code=String(order?.orderCode||'');
 const name=String(order?.clientName||'');
 const label=ORDER_LABELS[next]||'Ažurirano';
 return `Poštovani ${name},\n\nVaš ${order?.type==='INQUIRY'?'upit':'zahtev za porudžbinu'} ${code}: ${label.toLowerCase()}.\n\n${order?.type==='INQUIRY'?'Kontaktiraćemo vas sa informacijama o dostupnosti.':'Konačna dostupnost i cena potvrđuju se dogovorom.'}`;
}
