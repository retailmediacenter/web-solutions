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
// Original received items always remain untouched. A local amendment stores only
// excluded line indexes and a checked revised total; Redis/Booking are not involved.
const roundMoney=value=>Math.round((value+Number.EPSILON)*100)/100;
export function orderSelection(order,excluded=[]){
 if(!order||order.type!=='ORDER'||!Array.isArray(order.items)||!Array.isArray(excluded))throw new Error('Neispravna porudžbina.');
 const seen=new Set();
 for(const index of excluded){
  if(!Number.isInteger(index)||index<0||index>=order.items.length||seen.has(index))throw new Error('Neispravan izbor artikala.');
  seen.add(index);
 }
 const kept=order.items.filter((item,index)=>!seen.has(index));
 const removed=order.items.filter((item,index)=>seen.has(index));
 return {kept,removed,revisedTotal:roundMoney(kept.reduce((sum,item)=>sum+item.lineTotal,0))};
}
export function acceptOrderWithAmendment(order,excluded){
 if(order?.type!=='ORDER'||order?.status!==ORDER_STATUS.NEW)throw new Error('Izmena je dostupna samo za novu porudžbinu.');
 const selected=orderSelection(order,excluded);
 if(!selected.removed.length)throw new Error('Označi nedostupan artikal ili prihvati celu porudžbinu.');
 if(!selected.kept.length)throw new Error('Svi artikli su izbačeni; porudžbinu je moguće samo odbiti.');
 const result=nextOrderStatus(order,ORDER_STATUS.ACCEPTED);
 result.amendment={excludedIndexes:[...excluded].sort((a,b)=>a-b),originalTotal:order.total,revisedTotal:selected.revisedTotal,modifiedAt:result.updatedAt};
 return result;
}
export function validateOrderAmendment(order){
 if(order?.amendment==null)return true;
 const mod=order.amendment;
 if(order.type!=='ORDER'||order.status==='new'||!mod||typeof mod!=='object'||Array.isArray(mod)||!Array.isArray(mod.excludedIndexes)||!mod.excludedIndexes.length||mod.excludedIndexes.length>=order.items.length)throw new Error('Neispravna izmena porudžbine.');
 let selected;try{selected=orderSelection(order,mod.excludedIndexes);}catch{throw new Error('Neispravna izmena porudžbine.');}
 if(typeof mod.modifiedAt!=='string'||Number.isNaN(Date.parse(mod.modifiedAt))||!Number.isFinite(mod.originalTotal)||!Number.isFinite(mod.revisedTotal)||Math.abs(mod.originalTotal-order.total)>.011||Math.abs(mod.revisedTotal-selected.revisedTotal)>.011)throw new Error('Neispravan iznos izmene porudžbine.');
 return true;
}
export function orderReplyText(order,next){
 const code=String(order?.orderCode||'');
 const name=String(order?.clientName||'');
 const label=ORDER_LABELS[next]||'Ažurirano';
 if(order?.type==='ORDER'&&order.amendment&&next!==ORDER_STATUS.CANCELLED){
  const {kept,removed,revisedTotal}=orderSelection(order,order.amendment.excludedIndexes);
  const removedText=removed.map(item=>`${item.name} (${item.quantity} ${item.unit})`).join(', ');
  const keptText=kept.map(item=>`${item.name} (${item.quantity} ${item.unit})`).join(', ');
  const money=value=>new Intl.NumberFormat('sr-RS',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)+' RSD';
  const status=next==='accepted'?'prihvaćena sa izmenom':label.toLowerCase()+' (sa izmenom)';
  return `Poštovani ${name},\n\nVaša porudžbina ${code} je ${status}.\n\nNisu dostupni: ${removedText}.\nPreostali artikli: ${keptText}.\nNovi informativni iznos: ${money(revisedTotal)}.\n\nAko vam izmena ne odgovara, kontaktirajte prodavnicu. Hvala.`;
 }
 return `Poštovani ${name},\n\nVaš ${order?.type==='INQUIRY'?'upit':'zahtev za porudžbinu'} ${code}: ${label.toLowerCase()}.\n\n${order?.type==='INQUIRY'?'Kontaktiraćemo vas sa informacijama o dostupnosti.':'Konačna dostupnost i cena potvrđuju se dogovorom.'}`;
}
