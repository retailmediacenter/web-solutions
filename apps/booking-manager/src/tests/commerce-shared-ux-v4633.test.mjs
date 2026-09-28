import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=p=>readFileSync(fileURLToPath(new URL(p,import.meta.url)),'utf8');
const app=read('../app.mjs'),css=read('../style.css');

const slice=(start,end)=>{const s=app.indexOf(start),e=app.indexOf(end,s+start.length);assert.ok(s>=0&&e>s,`missing ${start}`);return app.slice(s,e);};
const renderShare=new Function('communicationType','hasWhatsAppRecipient','safe','messageFor',slice('function shareActions(b,','function openChannel(')+';return shareActions;')
  (status=>'confirmed', phone=>phone==='0641234567',value=>value,value=>'Poruka o rezervaciji');
const renderOrder=new Function('ORDER_STATUS','ORDER_LABELS','stateUI','orderSelection','safe','amount','orderWhen','orderReplyText','hasWhatsAppRecipient',
  slice('function orderDialog(o){','function rerenderOrderDialog()')+';return orderDialog;')
  ({NEW:'new'},{accepted:'Prihvaćeno'},{orderDraftRemoved:[]},o=>({kept:o.items,revisedTotal:o.total}),String,v=>String(v),()=>'',()=>'Pripremljena poruka',p=>p==='0641234567');
const order={id:'1',orderCode:'UKN67ZAV',type:'ORDER',status:'accepted',clientName:'Test kupac',phone:'0641234567',fulfillment:'PICKUP',createdAt:'2026-09-28T12:00:00Z',total:388,items:[{name:'Sok',quantity:1,unit:'kom',unitPrice:199,lineTotal:199},{name:'Čokolada',quantity:1,unit:'kom',unitPrice:189,lineTotal:189}]};

test('Booking after decision shows exactly two primary channel actions, preview and copy are disclosures',()=>{
 const html=renderShare({status:'confirmed',phone:'0641234567'},{compact:true});
 assert.match(html,/<div class="share-actions">[\s\S]*WhatsApp[\s\S]*Viber[\s\S]*<\/div>/);
 const group=html.match(/<div class="share-actions">([\s\S]*?)<\/div>/)[1];
 assert.doesNotMatch(group,/Kopiraj/);
 assert.match(html,/<details class="message-disclosure"><summary>Pregledaj poruku/);
 assert.match(html,/<details class="message-disclosure share-fallback"><summary>Ostale opcije/);
 assert.match(html,/data-action="share-copy"/);
});
test('non-compact Booking also hides preview until requested, without removing the copy fallback',()=>{
 const html=renderShare({status:'confirmed',phone:'0641234567'},{compact:false});
 assert.match(html,/<details class="message-disclosure"><summary>Pregledaj poruku/);
 assert.match(html,/data-action="share-copy"/);
 assert.match(html,/Otvaranje aplikacije nije potvrda slanja/);
});
test('Commerce decision keeps two visible channels, original order and actions intact, copy is secondary',()=>{
 const html=renderOrder(order);
 const group=html.match(/<div class="order-share-actions">([\s\S]*?)<\/div>/)[1];
 assert.match(group,/data-action="order-whatsapp"/);
 assert.match(group,/data-action="order-viber"/);
 assert.doesNotMatch(group,/Kopiraj/);
 assert.match(html,/<details class="message-disclosure share-fallback"><summary>Ostale opcije/);
 assert.match(html,/data-action="order-copy"/);
 assert.match(html,/UKN67ZAV/);
 assert.match(html,/Čokolada/);
 assert.match(html,/388/);
 assert.match(html,/Pregledaj poruku/);
});
test('Commerce retains optional phone correction without changing the source customer phone',()=>{
 const html=renderOrder({...order,phone:'000123'});
 assert.match(html,/<details class="message-disclosure order-phone-options"><summary>Promeni broj za poruku/);
 assert.match(html,/data-order-phone/);
 assert.match(html,/value="000123"/);
});
test('style keeps WhatsApp and Viber as two main CTAs and copy accessible as fallback',()=>{
 assert.match(css,/share-fallback/);
 assert.match(css,/order-share-actions \.btn/);
});
