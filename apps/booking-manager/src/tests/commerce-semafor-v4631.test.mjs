import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ORDER_STATUS,ORDER_LABELS,orderSelection,orderReplyText} from '../order-core.mjs';
const here=rel=>fileURLToPath(new URL(rel,import.meta.url));
const app=readFileSync(here('../app.mjs'),'utf8');
const css=readFileSync(here('../style.css'),'utf8');
const safe=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const amount=n=>`${Number(n).toFixed(2)} RSD`;
const cardFn=app.slice(app.indexOf('function orderCard(o){'),app.indexOf('function renderOrdersTeaser()'));
const renderCard=new Function('o','safe','ORDER_STATUS','ORDER_LABELS','amount','orderWhen','orderSelection',`${cardFn}; return orderCard(o);`);
const dialogFn=app.slice(app.indexOf('function orderDialog(o){'),app.indexOf('function rerenderOrderDialog()'));
const renderDialog=new Function('o','safe','ORDER_STATUS','ORDER_LABELS','amount','orderWhen','orderReplyText','orderSelection','stateUI',`${dialogFn}; return orderDialog(o);`);
const base={id:'order-1',type:'ORDER',orderCode:'UKN67ZAV',status:'new',clientName:'Dragan Došlo',phone:'060123456',createdAt:'2026-09-28T12:00:00Z',fulfillment:'PICKUP',note:'',items:[{name:'Čokolada',unit:'kom',quantity:1,unitPrice:189,lineTotal:189,image:''},{name:'Kafa',unit:'kom',quantity:1,unitPrice:849,lineTotal:849,image:''}],total:1038};
const card=o=>renderCard({...base,...o},safe,ORDER_STATUS,ORDER_LABELS,amount,()=> '28.09. 12:00',orderSelection);
const modal=o=>renderDialog({...base,...o},safe,ORDER_STATUS,ORDER_LABELS,amount,()=> '28.09. 12:00',orderReplyText,orderSelection,{orderDraftRemoved:[]});
test('samo broj porudžbine u velikom naslovu, UPIT ostaje jasno izdvojen',()=>{
 const order=modal({});
 assert.match(order,/<h2>UKN67ZAV<\/h2>/);
 assert.doesNotMatch(order,/<h2>PORUDŽBINA/);
 assert.match(order,/class="order-customer-title">Dragan Došlo/);
 assert.match(modal({type:'INQUIRY'}),/<h2>UPIT UKN67ZAV<\/h2>/);
});
test('red for new, amber for accepted/preparing/ready, green only on actual completion',()=>{
 assert.match(card({status:'new'}),/order-traffic-new/);
 for(const status of ['accepted','preparing','ready']){
  const out=card({status});assert.match(out,/order-traffic-progress/);
  assert.doesNotMatch(out,/order-traffic-completed/);
  assert.match(out,new RegExp(ORDER_LABELS[status]));
 }
 const completed=card({status:'completed'});
 assert.match(completed,/order-traffic-completed/);
 assert.match(completed,/>Preuzeto<\/span>/);
 assert.match(modal({status:'completed'}),/Preuzeto/);
});
test('closed orders are gray; inquiries cannot be presented as commerce traffic light',()=>{
 for(const status of ['declined','cancelled'])assert.match(card({status}),/order-traffic-closed/);
 const inquiry=card({type:'INQUIRY'});
 assert.match(inquiry,/order-traffic-inquiry/);
 assert.match(inquiry,/UPIT · UKN67ZAV/);
 assert.doesNotMatch(inquiry,/order-traffic-new/);
});
test('number, buyer, item count, sum and explicit accessible status; amended order count respects exclusions',()=>{
 const out=card({});
 for(const label of ['UKN67ZAV','Dragan Došlo','2 artikala','1038.00 RSD','Status: Novo'])assert.ok(out.includes(label),label);
 const amended=card({status:'accepted',amendment:{excludedIndexes:[0],originalTotal:1038,revisedTotal:849,modifiedAt:new Date().toISOString()}});
 for(const label of ['Prihvaćeno sa izmenom','1 artikal','849.00 RSD'])assert.ok(amended.includes(label),label);
 assert.doesNotMatch(amended,/>Čokolada · /);
});
test('colors do not change homepage stat cards, Booking CSS, pipeline or status transitions',()=>{
 const home=app.slice(app.indexOf('function renderOrdersHome(){'),app.indexOf('function renderOrders(){'));
 assert.match(home,/<div class="label">Novi zahtevi<\/div><div class="value">/);
 assert.match(home,/<div class="label">Ukupno primljeno<\/div><div class="value">/);
 for(const phase of ['new','progress','completed','closed','inquiry'])assert.ok(css.includes(`.order-card.order-traffic-${phase}`),phase);
 assert.match(css,/\.order-card \.order-traffic-dot/);
 for(const fn of ['persistStrict()','acceptOrderWithAmendment','changeOrderStatus'])assert.ok(app.includes(fn),fn);
});
