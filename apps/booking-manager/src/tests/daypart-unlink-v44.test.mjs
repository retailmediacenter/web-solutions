import test from 'node:test';
import assert from 'node:assert/strict';
import {dayPartDetailHtml} from '../daypart-ui.mjs';
import {detachSiteConnection} from '../portal-modules.mjs';
import {disconnectRemote} from '../queue-client.mjs';
const STATUS={PENDING:'pending',PROPOSED:'proposed',CONFIRMED:'confirmed',DECLINED:'declined',CANCELLED:'cancelled'};
const safe=s=>String(s??'').replace(/[<>&]/g,'');
const b={timingMode:'DAY_PART',clientName:'Dragan',status:STATUS.PENDING,dayPart:'MORNING',date:'2026-10-02',time:'',proposal:null};
const html=item=>dayPartDetailHtml({b:item,safe,formatDate:d=>d,dayPartLabel:x=>({MORNING:'Pre podne',AFTERNOON:'Posle podne'}[x]||x),today:()=> '2026-09-27',detailGrid:()=>'<div class="detail-grid">Podaci</div>',shareActions:(v,o)=>v.status===STATUS.PROPOSED?`<div data-compact="${o.compact}">WhatsApp Viber</div>`:'',STATUS});

test('DAY_PART first view: client context, one dominant proposal form, no redundant technical/status text',()=>{
 const view=html(b);
 assert.match(view,/Predloži termin/);assert.match(view,/Dragan/);assert.match(view,/2026-10-02.*Pre podne/);
 assert.match(view,/Detalji zahteva/);assert.match(view,/daypart-proposal-date/);assert.match(view,/daypart-proposal-time/);
 assert.equal((view.match(/data-action="save-daypart-proposal"/g)||[]).length,1);
 for(const copy of ['Čeka odgovor','DAY_PART zahtev ne zauzima','Predloži drugi termin','Postavi predlog','Poruke se ne šalju automatski'])assert.equal(view.includes(copy),false,copy);
});
test('DAY_PART prepared proposal shows compact message sharing and acceptance control',()=>{
 const view=html({...b,status:STATUS.PROPOSED,proposal:{date:'2026-10-03',time:'11:30'}});
 assert.match(view,/Izmeni predlog/);assert.match(view,/Sačuvan predlog/);
 assert.match(view,/data-compact="true"/);assert.match(view,/Potvrdi prihvaćen termin/);
});
test('Confirmed DAY_PART keeps original request window and exposes exact accepted time',()=>{
 const view=html({...b,status:STATUS.CONFIRMED,date:'2026-10-03',time:'11:30',requestedDate:b.date});
 assert.match(view,/Potvrđena intervencija/);assert.match(view,/2026-10-02.*Pre podne/);assert.match(view,/2026-10-03.*11:30/);
 assert.doesNotMatch(view,/save-daypart-proposal/);
});
test('detach keeps local business identity, services and calendar entries; server revoke is authenticated',async()=>{
 const conn={apiOrigin:'https://staging.example.invalid',siteId:'S'.repeat(24),accessToken:'A'.repeat(43)};
 const profiles=[{id:'local-site',queueConnection:conn,pushEnabledAt:'now',siteProfile:{business:{name:'Test'}},services:[{id:'1'}]}];
 const state={profiles,bookings:[{id:'old',profileId:'local-site'}]};
 const requests=[];
 await assert.rejects(()=>disconnectRemote(conn,{fetcher:async()=>{throw Error('503') }}),/503/);
 assert.equal(profiles[0].queueConnection,conn);
 const remote=await disconnectRemote(conn,{fetcher:async(url,options)=>{requests.push([url,options]);return {ok:true,json:async()=>({ok:true})};}});
 assert.deepEqual(remote,{ok:true});
 assert.equal(requests[0][0],`https://staging.example.invalid/api/booking/connections/${conn.siteId}`);
 assert.equal(requests[0][1].method,'DELETE');
 assert.equal(requests[0][1].headers.Authorization,`Bearer ${conn.accessToken}`);
 detachSiteConnection(profiles[0]);
 assert.equal(profiles[0].queueConnection,undefined);assert.equal(profiles[0].pushEnabledAt,undefined);
 assert.equal(profiles[0].services.length,1);assert.equal(state.bookings.length,1);
});
