import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ORDER_STATUS} from '../order-core.mjs';
const here=rel=>fileURLToPath(new URL(rel,import.meta.url));
const app=readFileSync(here('../app.mjs'),'utf8');
const css=readFileSync(here('../style.css'),'utf8');
const orderSource=app.slice(app.indexOf('function renderOrders(){'),app.indexOf('function orderDialog(o){'));
assert.ok(orderSource.startsWith('function renderOrders(){'));
const compileOrders=new Function('orders','stateUI','ORDER_STATUS','orderCard',`${orderSource};return renderOrders();`);
const fakeOrders=[
 {id:'s1',status:ORDER_STATUS.READY,createdAt:'2026-09-28T11:00:00Z'},
 {id:'s2',status:ORDER_STATUS.COMPLETED,createdAt:'2026-09-28T12:00:00Z'}
];
const view=(filter,items=fakeOrders)=>compileOrders(()=>items,{orderFilter:filter},ORDER_STATUS,o=>`<div data-test-order="${o.id}"></div>`);
const tab=(html,id,label,count)=>{
 const match=html.match(new RegExp(`<button class="filter [^"]*" data-action="order-filter" data-filter="${id}"[^>]*>${label} <span class="order-filter-count">(\\d+)</span></button>`));
 assert.ok(match,`Expected badge for ${label}`);
 assert.equal(Number(match[1]),count);
};
test('total always describes all requests even when active filter is empty',()=>{
 const out=view('open');
 assert.match(out,/Ukupno: 2 zahteva/);
 assert.match(out,/Nema zahteva za izabrani filter/);
 assert.doesNotMatch(out,/data-test-order=/);
 for(const [id,label,count] of [['open','Aktivne',0],['ready','Spremne',1],['done','Završene',1],['closed','Odbijene \/ otkazane',0],['all','Sve',2]])tab(out,id,label,count);
});
test('filter badges remain consistent with the exact matching visible cards',()=>{
 let output=view('ready');
 assert.match(output,/data-test-order="s1"/);
 assert.doesNotMatch(output,/data-test-order="s2"/);
 assert.match(output,/Ukupno: 2 zahteva/);
 output=view('done');
 assert.match(output,/data-test-order="s2"/);
 assert.doesNotMatch(output,/data-test-order="s1"/);
 output=view('all');
 assert.equal((output.match(/data-test-order=/g)||[]).length,2);
});
test('counts track every supported order status without merging ready with active',()=>{
 const types=['new','accepted','preparing','ready','completed','answered','declined','cancelled'];
 const records=types.map((status,i)=>({id:`o${i}`,status,createdAt:`2026-09-28T12:00:0${i}Z`}));
 const output=view('open',records);
 assert.match(output,/Ukupno: 8 zahteva/);
 for(const [id,label,count] of [['open','Aktivne',3],['ready','Spremne',1],['done','Završene',2],['closed','Odbijene \/ otkazane',2],['all','Sve',8]])tab(output,id,label,count);
 assert.equal((output.match(/data-test-order=/g)||[]).length,3);
});
test('zero requests are reflected in total and every tab badge',()=>{
 const out=view('all',[]);
 assert.match(out,/Ukupno: 0 zahteva/);
 assert.equal((out.match(/order-filter-count">0</g)||[]).length,5);
});

const toastSource=app.slice(app.indexOf('function toast(message){'),app.indexOf('function download('));
assert.ok(toastSource.startsWith('function toast(message){'));
const runToast=({open})=>{
 let dialogNote=null,globalVisible=false,timeout=null;
 const outside={textContent:'',classList:{add(cls){if(cls==='visible')globalVisible=true;},remove(cls){if(cls==='visible')globalVisible=false;}}};
 const head={insertAdjacentElement(where,element){assert.equal(where,'afterend');dialogNote=element;}};
 const dialog={querySelector(selector){return selector==='.dialog-head'?head:null;},prepend(element){dialogNote=element;}};
 const doc={
  querySelector(q){assert.equal(q,'dialog[open]');return open?dialog:null;},
  querySelectorAll(q){assert.equal(q,'.dialog-inline-toast');return dialogNote?[{remove(){dialogNote=null;}}]:[];},
  createElement(tag){assert.equal(tag,'div');return {setAttribute(name,value){this[name]=value;},remove(){dialogNote=null;}};}
 };
 const wrapper=new Function('byId','document','clearTimeout','setTimeout',`let toastTimer;${toastSource};return toast;`);
 const toast=wrapper(id=>{assert.equal(id,'toast');return outside;},doc,()=>{},fn=>{timeout=fn;return 1;});
 return {toast,peek:()=>({dialogNote,globalVisible,outside}),expire:()=>timeout?.()};
};
test('while a native modal is open, feedback is inside dialog after header; never behind backdrop',()=>{
 const mock=runToast({open:true});
 mock.toast('Izmena je sačuvana.');
 let state=mock.peek();
 assert.equal(state.dialogNote.textContent,'Izmena je sačuvana.');
 assert.equal(state.dialogNote.role,'status');
 assert.equal(state.dialogNote['aria-live'],'polite');
 assert.equal(state.globalVisible,false);
 mock.expire();
 assert.equal(mock.peek().dialogNote,null);
});
test('without an open modal, existing global toast behavior stays intact',()=>{
 const mock=runToast({open:false});
 mock.toast('Firma je povezana.');
 assert.equal(mock.peek().outside.textContent,'Firma je povezana.');
 assert.equal(mock.peek().globalVisible,true);
 mock.expire();
 assert.equal(mock.peek().globalVisible,false);
});
test('inline feedback has deliberate layout and does not depend on z-index escaping native modal',()=>{
 assert.match(css,/\.dialog-inline-toast\{[^}]*flex:none/);
 assert.match(css,/\.order-filter-count\{/);
 assert.doesNotMatch(toastSource,/zIndex|z-index/);
});
