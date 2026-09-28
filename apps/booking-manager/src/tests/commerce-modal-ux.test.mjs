import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ORDER_LABELS,ORDER_STATUS,orderSelection,orderReplyText} from '../order-core.mjs';
const here=dir=>fileURLToPath(new URL(dir,import.meta.url));
const app=readFileSync(here('../app.mjs'),'utf8');
const fn=app.slice(app.indexOf('function orderDialog(o){'),app.indexOf('function rerenderOrderDialog()'));
const safe=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const amount=n=>`${Number(n).toFixed(2)} RSD`;
const render=new Function('o','safe','ORDER_STATUS','ORDER_LABELS','amount','orderWhen','orderReplyText','orderSelection','stateUI',`${fn}; return orderDialog(o);`);
const make=(change={})=>({type:'ORDER',orderCode:'UKN67ZAV',status:'new',clientName:'Dragan',phone:'060123456',createdAt:'2026-09-28T12:00:00Z',fulfillment:'PICKUP',note:'pozvati pre preuzimanja',items:[{name:'Čokolada',unit:'kom',quantity:1,unitPrice:189,lineTotal:189,image:''},{name:'Kafa',unit:'kom',quantity:2,unitPrice:849,lineTotal:1698,image:''}],total:1887,...change});
const html=(order,removed=[])=>render(order,safe,ORDER_STATUS,ORDER_LABELS,amount,()=> '28.09. 12:00',orderReplyText,orderSelection,{orderDraftRemoved:removed});
test('products first: large order number, small buyer name; note, delivery and footer actions',()=>{
 const text=html(make());
 assert.match(text,/<h2>UKN67ZAV<\/h2>/);
 assert.match(text,/class="order-customer-title">Dragan/);
 assert.ok(text.indexOf('class="order-products"')<text.indexOf('class="order-total"'));
 assert.ok(text.indexOf('class="order-total"')<text.indexOf('class="order-meta"'));
 assert.ok(text.indexOf('class="order-meta"')<text.indexOf('class="order-modal-footer"'));
 assert.match(text,/class="order-row-info"><strong>Čokolada/);
 assert.match(text,/Nema na stanju/);
 assert.match(text,/Odbijeno/);assert.match(text,/Prihvaćeno sa izmenom/);
 assert.doesNotMatch(text,/class="order-line"/);
});
test('removal proposal recalculates total but does not remove original rows; forces proper choice',()=>{
 const text=html(make(),[0]);
 assert.match(text,/189\.00 RSD/);assert.match(text,/1698\.00 RSD/);
 assert.match(text,/class="order-row removed"/);
 assert.match(text,/class="order-item-toggle restore"/);
 assert.match(text,/Prvobitno: 1887\.00 RSD/);
 assert.match(text,/data-status="accepted" disabled/);
 assert.match(text,/data-action="order-accept-modified"/);
});
test('all removed forbids both accept buttons but permits refusal and undo',()=>{
 const text=html(make(),[0,1]);
 assert.match(text,/data-action="order-accept-modified" disabled/);
 assert.match(text,/data-status="declined"/);
 assert.equal((text.match(/>Vrati<\/button>/g)||[]).length,2);
});
test('stored accepted-with-modification retains original items, shows removal and message controls',()=>{
 const order=make({status:'accepted',amendment:{excludedIndexes:[0],originalTotal:1887,revisedTotal:1698,modifiedAt:new Date().toISOString()}});
 const text=html(order);
 assert.match(text,/Prihvaćeno sa izmenom/);
 assert.match(text,/Nije dostupno/);
 assert.match(text,/data-action="order-whatsapp"/);
 assert.match(text,/data-action="order-viber"/);
 assert.match(text,/data-action="order-copy"/);
 assert.match(text,/Čokolada/);
 assert.match(text,/1698\.00 RSD/);
});
test('inquiry remains separate and cannot alter products or invent ORDER total',()=>{
 const text=html(make({type:'INQUIRY'}));
 assert.match(text,/<h2>UPIT UKN67ZAV<\/h2>/);
 assert.doesNotMatch(text,/class="order-total"/);
 assert.doesNotMatch(text,/data-action="order-toggle-item"/);
 assert.match(text,/data-status="answered"/);
});
test('original home cards use stacked block elements, not inline oversized digits',()=>{
 const begin=app.indexOf('function renderOrdersHome('),end=app.indexOf('function renderOrders(){',begin);
 const home=app.slice(begin,end);
 assert.match(home,/<div class="label">Novi zahtevi<\/div><div class="value">/);
 assert.match(home,/<div class="label">Ukupno primljeno<\/div><div class="value">/);
 assert.doesNotMatch(home,/<strong class="value">/);
});
test('existing order mutations still persist before refresh and preserve manual delivery',()=>{
 for(const name of ['persistStrict()','acceptOrderWithAmendment','changeOrderStatus','shareOrder','openOrderDetails','pullOrderInbox'])assert.ok(app.includes(name));
 assert.match(app,/Pošalji obaveštenje kupcu/);
 assert.doesNotMatch(app,/(?:order-customer-confirm|buyer-approval)/);
});
