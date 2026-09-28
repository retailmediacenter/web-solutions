import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {makeProfile,validateImport} from '../booking-core.mjs';
import {normalizeIncomingOrder,ORDER_STATUS} from '../order-core.mjs';
import {portalModules} from '../portal-modules.mjs';
const here=dir=>fileURLToPath(new URL(dir,import.meta.url));
const id='Q'.repeat(24);
const sample={requestId:'cb716e15-3a44-4d11-8077-a34d576ceff2',orderCode:'ABCDEFGH',type:'ORDER',clientName:'Korisnik',phone:'060123456',note:'',fulfillment:'PICKUP',items:[{productId:'shirt_1',name:'Majica',unit:'kom',quantity:2,unitPrice:1000,lineTotal:2000}],total:2000,currency:'RSD',pricing:'indicative',receivedAt:'2026-09-28T10:00:00.000Z'};
const p=makeProfile('Prodavnica');p.services=[];p.siteProfile={business:{name:p.name},services:[],commerce:{enabled:true,currency:'RSD',products:[{id:'shirt_1',name:'Majica',unit:'kom',price:1000}]}};
const snapshot={schema:1,activeProfileId:p.id,profiles:[p],bookings:[],savedAt:null};
test('stare Booking kopije ostaju validne i dobijaju prazne porudžbine',()=>{
 const restored=validateImport(snapshot);assert.deepEqual(restored.orders,[]);assert.deepEqual(portalModules(restored.profiles[0]),{booking:false,orders:true});
});
test('nove Portal kopije čuvaju Commerce informacije bez menjanja Booking formata',()=>{
 const order=normalizeIncomingOrder(sample,p.id,id);
 const restored=validateImport({...snapshot,orders:[order]});
 assert.equal(restored.orders[0].orderCode,'ABCDEFGH');assert.equal(restored.orders[0].total,2000);
 assert.equal(restored.profiles[0].id,p.id);
});
test('oštećena i tuđa porudžbina odbija se pre zamene lokalnih podataka',()=>{
 const order=normalizeIncomingOrder(sample,p.id,id);
 for(const changed of [{...order,profileId:'nepoznato'},{...order,status:'invented'},{...order,items:[]},{...order,orderCode:'TOKEN'}]){
  assert.throws(()=>validateImport({...snapshot,orders:[changed]}),/porudžbin|artikal/i);
 }
});
test('Portal UI ima odvojen Commerce prikaz, statuse i ručno slanje; Booking ostaje prisutan',()=>{
 const app=readFileSync(here('../app.mjs'),'utf8'),index=readFileSync(here('../../index.html'),'utf8');
 assert.match(index,/data-view="reservations"/);assert.match(index,/data-view="orders"/);assert.match(index,/id="order-dialog"/);
 for(const s of ['pullOrderInbox','persistStrict','renderOrdersHome','renderOrders','orderDialog','changeOrderStatus','orderReplyText','shareOrder'])assert.ok(app.includes(s),s);
 assert.match(app,/state\.orders\[index\]=order;throw error/);
 assert.match(app,/statusi se čuvaju lokalno/i);
 assert.equal(ORDER_STATUS.NEW,'new');
});
