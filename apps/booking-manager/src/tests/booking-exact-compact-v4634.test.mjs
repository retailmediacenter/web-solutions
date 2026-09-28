import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {exactTimeDetailHtml} from '../exact-time-ui.mjs';
import {STATUS} from '../booking-core.mjs';

const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source=readFileSync(fileURLToPath(new URL('../app.mjs',import.meta.url)),'utf8');
const css=readFileSync(fileURLToPath(new URL('../style.css',import.meta.url)),'utf8');
const b={id:'b1',reservationCode:'N526TARN',clientName:'Franja',serviceName:'Tematska degustacija',phone:'0641234567',date:'2026-09-30',time:'10:00',duration:60,units:1,notes:'Broj osoba: 7; Bez alkohola za jednog gosta',status:STATUS.PENDING,proposal:null};
const render=(value=b,{ok=true,reason='Zauzeto'}={})=>exactTimeDetailHtml({b:value,STATUS,safe,statName:{[STATUS.PENDING]:'Čeka odgovor',[STATUS.PROPOSED]:'Predlog pripremljen',[STATUS.CONFIRMED]:'Potvrđeno',[STATUS.DECLINED]:'Odbijeno',[STATUS.CANCELLED]:'Otkazano'},scheduleText:x=>`${x.date} u ${x.time}`,formatDate:x=>x,original:{ok,reason},proposalChoices:'<button data-action="choose-proposal" data-date="2026-10-01" data-time="11:00">01.10 u 11</button>',shareActions:()=>'<div class="share-bar"><button data-action="share-whatsapp">WhatsApp</button><button data-action="share-viber">Viber</button></div>'});

test('EXACT_TIME opens compact with only large reservation code, buyer and service/slot/guest priorities',()=>{
 const html=render();
 assert.match(html,/<h2>N526TARN<\/h2>/);
 assert.match(html,/exact-customer">Franja/);
 assert.match(html,/<small>USLUGA<\/small><strong>Tematska degustacija<\/strong>/);
 assert.match(html,/<small>TRAŽENI TERMIN<\/small><strong>2026-09-30 u 10:00<\/strong>/);
 assert.match(html,/<small>BROJ OSOBA<\/small><strong>7<\/strong>/);
 assert.match(html,/<small>NAPOMENA<\/small><p>Bez alkohola za jednog gosta<\/p>/);
 assert.doesNotMatch(html,/detail-grid|ZAHTEV \/ TEST|Rezervacioni kod/);
 assert.match(html,/<details class="exact-extra">/);
 assert.match(html,/data-action="share-whatsapp"/);
});
test('pending shows confirm, propose, decline, not proposal confirmation or visible proposal list',()=>{
 const html=render();
 assert.match(html,/data-action="confirm-booking"/);
 assert.match(html,/data-action="open-exact-proposal"/);
 assert.match(html,/data-action="decline-booking"/);
 assert.doesNotMatch(html,/data-action="confirm-proposal"/);
 assert.match(html,/id="exact-proposal-editor"[^>]* hidden/);
 assert.match(html,/data-action="save-proposal" disabled/);
});
test('busy slot cannot be confirmed but proposal remains possible',()=>{
 const html=render(b,{ok:false,reason:'Termin je već zauzet'});
 assert.match(html,/data-action="confirm-booking" disabled/);
 assert.match(html,/Termin je već zauzet/);
 assert.match(html,/data-action="open-exact-proposal"/);
});
test('PROPOSED displays actual persisted proposal and confirm-proposal, never assumes sending message',()=>{
 const html=render({...b,status:STATUS.PROPOSED,proposal:{date:'2026-10-01',time:'11:00'}});
 assert.match(html,/<small>POSLATI PREDLOG<\/small><strong>2026-10-01 u 11:00<\/strong>/);
 assert.match(html,/data-action="confirm-proposal"/);
 assert.match(html,/data-action="cancel-booking"/);
 assert.doesNotMatch(html,/data-action="decline-booking"/);
});
test('confirmed and rejected show only relevant actions, not a new proposal editor',()=>{
 const yes=render({...b,status:STATUS.CONFIRMED});
 assert.match(yes,/data-action="ics"/);
 assert.match(yes,/data-action="cancel-booking"/);
 assert.doesNotMatch(yes,/open-exact-proposal|confirm-booking|save-proposal/);
 const no=render({...b,status:STATUS.DECLINED});
 assert.doesNotMatch(no,/open-exact-proposal|confirm-booking|confirm-proposal|data-action="ics"/);
});
test('do not fake guest count from staff/resource units',()=>{
 const html=render({...b,notes:'Potrebna velika sala'});
 assert.doesNotMatch(html,/<small>BROJ OSOBA<\/small>/);
 assert.match(html,/Potrebna velika sala/);
});
test('escape untrusted reservation data in compact modal',()=>{
 const html=render({...b,clientName:'<script>x</script>',serviceName:'<img src=x>',notes:'<b>tekst</b>'});
 assert.doesNotMatch(html,/<script>|<img src=x>|<b>tekst<\/b>/);
 assert.match(html,/&lt;script&gt;x&lt;\/script&gt;/);
});
test('Booking app keeps DAY_PART separate, proposal selection checks slot, and all native status actions',()=>{
 assert.match(source,/import \{dayPartDetailHtml\}/);
 assert.match(source,/import \{exactTimeDetailHtml\}/);
 assert.match(source,/if\(dayPart\)[\s\S]*dayPartDetailHtml[\s\S]*showModal\(\);return/);
 assert.match(source,/exactTimeDetailHtml\(\{b,STATUS/);
 assert.match(source,/if\(a==='open-exact-proposal'\)/);
 assert.match(source,/if\(a==='choose-proposal'\)return chooseProposal/);
 assert.match(source,/if\(action==='confirm-booking'\)[\s\S]*slotCheck/);
 assert.match(source,/function mutateBooking\(action\)/);
});
test('EXACT modal has independent constrained scroll and mobile safe layout; Commerce styles preserved',()=>{
 assert.match(css,/#booking-dialog\.exact-compact/);
 assert.match(css,/#booking-dialog \.exact-body\{[^}]*overflow-y:auto/);
 assert.match(css,/#booking-dialog \.exact-proposal\[hidden\]\{display:none!important/);
 assert.match(css,/#order-dialog \.order-row/);
 assert.match(css,/\.daypart-compact/);
});
