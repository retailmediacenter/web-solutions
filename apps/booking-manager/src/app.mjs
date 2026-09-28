import {STATUS,DAYS,clone,makeId,makeProfile,normalizeRequest,slotCheck,alternatives,addDays,dateKey,dateOf,formatDate,weekStart,formatRequest,validateImport,icsFor,isDate,isTime,toMin,fromMin,dayPartLabel} from './booking-core.mjs';
import {whatsappUrl,viberUrl,hasWhatsAppRecipient,communicationType,reservationMessage} from './messaging.mjs';
import {createPairing,decodePairing,openEncryptedLink} from './secure-link.mjs';
import {applySiteProfile,claimPairing,disconnectRemote,getPushPublicKey,pullInbox,pullOrderInbox,subscribePush,validApiOrigin,validPairingCode} from './queue-client.mjs';
import {ORDER_STATUS,ORDER_LABELS,normalizeIncomingOrder,nextOrderStatus,orderReplyText,orderSelection,acceptOrderWithAmendment} from './order-core.mjs';
import {activatePortalProfile,activePortalProfileId,detachSiteConnection,portalModules} from './portal-modules.mjs';
import {dayPartDetailHtml} from './daypart-ui.mjs';

const byId = id => document.getElementById(id);
const safe = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => dateKey(new Date());
const isoNow = () => new Date().toISOString();
const statName = {[STATUS.PENDING]:'Čeka odgovor',[STATUS.CONFIRMED]:'Potvrđeno',[STATUS.PROPOSED]:'Predlog pripremljen',[STATUS.DECLINED]:'Odbijeno',[STATUS.CANCELLED]:'Otkazano'};
const stateUI = {view:'home',reservationTab:'requests',settingsEditor:'',date:today(),filter:'all',selectedId:null,proposal:null,orderFilter:'open',selectedOrderId:null,orderDraftRemoved:[]};
const CHANNEL='rmc-booking-local'; let channel; let state,writing=Promise.resolve(),toastTimer;
let polling=false,pollTimer=null,unlinking=false;
let serviceWorkerReady=null;
let pendingIncoming=(location.hash.match(/^#rmb=(B1\.[a-zA-Z0-9_-]+)$/)||[])[1]||null;

// IndexedDB stores one complete snapshot. There are no cloud/API calls.
const openDatabase = () => new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)) return reject(new Error('IndexedDB nije dostupan.'));
  const r=indexedDB.open('rmc-booking-manager-v431',1);
  r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots');};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
});
let db;
async function readState(){
  try{db=await openDatabase();return await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots');const r=tx.objectStore('snapshots').get('current');r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}
  catch(e){byId('notice').textContent='Pregledač ne dozvoljava lokalnu bazu. Podaci se NEĆE čuvati. Proveri privatni režim i podešavanja browsera.';return null;}
}
async function persist(){
  if(!db){byId('notice').textContent='Čuvanje podataka nije dostupno: NE koristi za stvarne rezervacije.';return;}
  // Serialize writes to avoid overwriting later mutations with earlier snapshots.
  const snapshot=clone({...state,savedAt:isoNow()});
  writing=writing.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{
    const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(snapshot,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  }));
  try{await writing;if(channel) channel.postMessage({kind:'changed'});}catch(e){byId('notice').textContent='Greška upisa na uređaj: '+e.message+' — odmah izvezi rezervnu kopiju.';}
}
// Save must REJECT after failed IndexedDB transaction before any server ACK.
async function persistStrict(){
 if(!db)throw new Error('Lokalna baza nije dostupna. Povezivanje i preuzimanje su zaustavljeni.');
 const snapshot=clone({...state,savedAt:isoNow()});
 writing=writing.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{
  const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(snapshot,'current');
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('Greška upisa.'));
  tx.onabort=()=>reject(tx.error||new Error('Upis je prekinut.'));
 }));
 await writing;if(channel)channel.postMessage({kind:'changed'});
}
function profile(){return state.profiles.find(p=>p.id===state.activeProfileId)||null;}
const emptyPortalState=()=>({schema:1,activeProfileId:null,profiles:[],bookings:[],orders:[],savedAt:null});
const apiDefault=(import.meta.env.VITE_BOOKING_API_URL||'').trim();
async function connectShortCode(){
 let p=profile();const code=byId('queue-code')?.value.toUpperCase().trim();
 const origin=validApiOrigin(byId('queue-api')?.value.trim()||apiDefault);
 if(!validPairingCode(code))throw new Error('Kod mora imati format XXXX-XXXX-XX.');
 if(!db)throw new Error('Lokalna baza nije dostupna. Ne povezuj uređaj.');
 if(p?.queueConnection&&!window.confirm('Ova firma je već povezana. Zameniti pristup na ovom uređaju? Staro sanduče više neće biti dostupno kroz ovaj profil.'))return;
 const connected=await claimPairing(origin,code);
  if(!p){
  if(!connected.profile)throw new Error('Server nije vratio poslovni profil. Povezivanje nije sačuvano.');
  p=makeProfile(connected.profile.business.name);p.services=[];
  state=activatePortalProfile(state,p);
 }
 if(connected.profile)applySiteProfile(p,connected.profile);
 p.queueConnection={siteId:connected.siteId,accessToken:connected.accessToken,apiOrigin:origin,connectedAt:isoNow()};
 try{await persistStrict();}
 catch(e){
  // Claim consumes the short code. Give user a recovery route if local persistence fails.
  const recovery=JSON.stringify(p.queueConnection);
  window.prompt('VAŽNO: kod je potrošen, ali lokalno čuvanje nije uspelo. Privremeno sačuvaj ove pristupne podatke i ne zatvaraj aplikaciju:',recovery);
  throw e;
 }
 byId('queue-code').value='';refresh();toast('Firma je povezana. Proveravam nove zahteve.');
 await syncQueuedRequests();
}
async function disconnectSite(){
 const p=profile(),conn=p?.queueConnection;
 if(!conn)throw new Error('Sajt nije povezan.');
 if(unlinking)throw new Error('Prekid povezivanja je već u toku.');
 if(polling)throw new Error('Sinhronizacija je u toku. Sačekaj nekoliko sekundi i pokušaj ponovo.');
 if(!db)throw new Error('Lokalna baza nije dostupna. Ne menjamo pristup dok ne radi čuvanje.');
 const warning='Prekidom povezivanja novi zahtevi sa sajta NEĆE stizati dok ga ponovo ne upariš. Postojeće rezervacije, porudžbine i kalendar ostaju na ovom uređaju. Nastaviti?';
 if(!window.confirm(warning))return;
 unlinking=true;
 try{
  // Remote revocation happens FIRST; an API error must not silently remove local access.
  await disconnectRemote(conn);
  const previous={queueConnection:conn,pushEnabledAt:p.pushEnabledAt};
  detachSiteConnection(p);
  try{await persistStrict();}
  catch(error){
   Object.assign(p,previous);
   byId('notice').textContent='Server je prekinuo pristup, ali lokalno čuvanje nije uspelo. Sačuvaj rezervnu kopiju i osveži Portal. Ponovno uparivanje traži novi jednokratni kod.';
   throw error;
  }
  stateUI.settingsEditor='';refresh();toast('Veza je prekinuta. Rezervacije i porudžbine su sačuvane.');
 }finally{unlinking=false;}
}
async function syncQueuedRequests({silent=false}={}){
 if(polling||unlinking||!db||!navigator.onLine)return;
 const active=profile(),profiles=active?.queueConnection?[active]:[];
 if(!profiles.length)return;
 polling=true;
 try{
  let count=0,failed=[];
  for(const p of profiles){
   try{
    const conn=p.queueConnection;
    const modules=portalModules(p);
    if(modules.booking){
     try{count+=await pullInbox({connection:conn,profile:p,bookings:state.bookings,
       save:persistStrict,normalize:normalizeRequest});}
     catch(e){failed.push(`${p.name} / rezervacije: ${e.message}`);}
    }
    if(modules.orders){
     try{count+=await pullOrderInbox({connection:conn,profile:p,orders:state.orders,
       save:persistStrict,normalize:normalizeIncomingOrder});}
     catch(e){failed.push(`${p.name} / porudžbine: ${e.message}`);}
    }
   }catch(e){failed.push(`${p.name}: ${e.message}`);}
  }
  if(count){refresh();toast(`Preuzeto novih zahteva: ${count}.`);}
  if(failed.length&&!silent){toast('Sinhronizacija: '+failed.join('; ').slice(0,180));}
  const status=byId('queue-status');if(status)status.textContent=failed.length?'Greška preuzimanja. Pokušaj ponovo.':`Poslednja provera: ${new Date().toLocaleTimeString('sr-RS')}`;
 }finally{polling=false;}
}

function bookings(){return state.bookings.filter(x=>x.profileId===profile().id);}
function orders(){return (state.orders||[]).filter(x=>x.profileId===profile().id);}
function orderById(id){return (state.orders||[]).find(x=>x.id===id&&x.profileId===profile().id);}
const amount=n=>new Intl.NumberFormat('sr-RS',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0))+' RSD';
const orderWhen=s=>{const date=new Date(s);return Number.isNaN(date.getTime())?'':date.toLocaleString('sr-RS',{dateStyle:'medium',timeStyle:'short'});};
function reservation(id){return state.bookings.find(x=>x.id===id && x.profileId===profile().id);}
function serviceOf(id){return profile().services.find(x=>x.id===id);}
function toast(message){const e=byId('toast');e.textContent=message;e.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('visible'),3400);}
function download(name,mime,text){const u=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
async function copyText(value){
  try{await navigator.clipboard.writeText(value);toast('Poruka kopirana. Nalepi je u Viber ili WhatsApp.');}
  catch(e){const d=document.createElement('textarea');d.value=value;d.style.position='fixed';d.style.top='-1000px';document.body.append(d);d.select();try{if(!document.execCommand('copy'))throw new Error('No copy');toast('Poruka kopirana.');}catch(e){window.prompt('Kopiraj poruku:',value);}d.remove();}
}
const scheduleText=b=>b.timingMode==='DAY_PART'&&!(b.status===STATUS.CONFIRMED&&b.time)?`${formatDate(b.requestedDate||b.date)} · ${dayPartLabel(b.requestedDayPart||b.dayPart)}`:`${formatDate(b.date)} u ${b.time}`;
const summaryLine = b=>`${scheduleText(b)} · ${b.duration} min`;
function messageFor(b,type){
  const date=type==='proposed'&&b.proposal?b.proposal.date:b.date;
  const time=type==='proposed'&&b.proposal?b.proposal.time:b.time;
  return reservationMessage({type,businessName:profile().name,serviceName:b.serviceName,dateLabel:formatDate(date),time,reservationCode:b.reservationCode||b.sourceRequestId||b.id});
}
function communicationPhone(b){return byId('booking-dialog')?.querySelector('[data-contact-phone]')?.value.trim()||b.phone||'';}
function shareActions(b,{compact=false}={}){
  const type=communicationType(b.status);if(!type)return '';
  const phone=b.phone||'',valid=hasWhatsAppRecipient(phone);
  const label=type==='proposed'?'predlog':type==='declined'?'obaveštenje o nedostupnosti':'potvrdu rezervacije';
  const correction=valid?'':`<label class="contact-correction">Broj za poruku<input type="tel" data-contact-phone value="${safe(phone)}" autocomplete="tel" placeholder="npr. +381 64 123 4567"></label><p class="warning">Broj iz zahteva nije validan za direktan WhatsApp razgovor. Ispravi ga samo za ovu poruku; original u rezervaciji ostaje nepromenjen.</p>`;
  const preview=`<textarea class="message-preview" readonly aria-label="Pripremljena poruka">${safe(messageFor(b,type))}</textarea>`;
  return `<div class="share-bar${compact?' daypart-share':''}"><strong>Poruka za klijenta: ${label}</strong>${correction}
    ${compact?`<details class="message-disclosure"><summary>Pregledaj poruku</summary>${preview}</details>`:preview}
    <div class="share-actions"><button type="button" class="btn share-whatsapp" data-action="share-whatsapp">WhatsApp ↗</button><button type="button" class="btn share-viber" data-action="share-viber">Viber ↗</button><button type="button" class="btn btn-light" data-action="share-copy">Kopiraj poruku</button></div>
    ${compact?'':'<p>Otvaranje aplikacije nije potvrda slanja. Pregledaj poruku i pošalji je ručno. Viber može tražiti izbor primaoca.</p>'}</div>`;
}
function openChannel(b,channelName){
  const type=communicationType(b?.status);if(!b||!type)throw new Error('Prvo pripremi poslovnu odluku za ovaj zahtev.');
  const msg=messageFor(b,type),phone=communicationPhone(b);
  if(channelName==='whatsapp'){
    if(!hasWhatsAppRecipient(phone))throw new Error('Unesi validan broj sa pozivnim brojem za WhatsApp.');
    window.open(whatsappUrl(phone,msg),'_blank','noopener,noreferrer');
    toast('WhatsApp je otvoren sa pripremljenom porukom. Ručno proveri i pošalji.');
  }else{
    window.location.href=viberUrl(msg);
    toast('Pokušavamo da otvorimo Viber sa pripremljenom porukom. Primaoca biraš u Viberu.');
  }
}function refresh(){
  const p=profile();
  if(!p){
    stateUI.view='home';
    document.querySelector('.workspace').hidden=true;
    byId('business-name').textContent='Povežite firmu';
    byId('pending-count').hidden=true;byId('order-pending-count').hidden=true;
    document.querySelector('.new-request').hidden=true;
    document.querySelectorAll('.nav-item').forEach(item=>item.hidden=true);
    document.querySelector('.side-backup').hidden=true;
    byId('page-title').textContent='Povežite firmu';byId('page-subtitle').textContent='Unesite kratki kod koji ste dobili uz generisani sajt.';
    byId('main-view').innerHTML=renderOnboarding();return;
  }
  state.activeProfileId=p.id;
  document.querySelector('.workspace').hidden=false;
  byId('business-name').textContent=p.siteProfile?.business?.name||p.name;
  document.querySelector('.side-backup').hidden=false;
  const modules=portalModules(p);
  if(stateUI.view==='reservations'&&!modules.booking)stateUI.view='home';
  if(stateUI.view==='orders'&&!modules.orders)stateUI.view='home';
  const pending=modules.booking?bookings().filter(x=>x.status===STATUS.PENDING).length:0;
  byId('pending-count').hidden=!pending;byId('pending-count').textContent=pending;
  const newOrders=modules.orders?orders().filter(x=>x.status===ORDER_STATUS.NEW).length:0;
  byId('order-pending-count').hidden=!newOrders;byId('order-pending-count').textContent=newOrders;
  document.querySelector('.new-request').hidden=!modules.booking||stateUI.view!=='reservations';
  document.querySelectorAll('.nav-item').forEach(x=>{const allowed=x.dataset.view==='reservations'?modules.booking:x.dataset.view==='orders'?modules.orders:true;x.hidden=!allowed;x.classList.toggle('active',x.dataset.view===stateUI.view);});
  const pages={home:['Poslovni pregled','Novi zahtevi i aktivnosti firme na jednom mestu.'],reservations:['Rezervacije','Zahtevi, dnevni raspored i nedeljni pregled.'],orders:['Porudžbine','Porudžbine, upiti i statusi. Iznosi su informativni.'],settings:['Podešavanja','Podaci firme, moduli i lokalna arhiva.']};
  byId('page-title').textContent=pages[stateUI.view][0];byId('page-subtitle').textContent=pages[stateUI.view][1];
  byId('main-view').innerHTML=({home:renderHome,reservations:renderReservations,orders:renderOrders,settings:renderSettings})[stateUI.view]();
}
function renderOnboarding(){return `<section class="portal-welcome panel"><div class="panel-body"><span class="tiny-label">DOBRO DOŠLI</span><h2>Povežite svoju firmu</h2><p class="hint">Jednokratni kod preuzmi sa privatnog završnog ekrana generatora. Portal automatski preuzima poslovni profil i aktivne module.</p>${apiDefault?`<label>Jednokratni kod<input id="queue-code" autocapitalize="characters" autocomplete="off" maxlength="12" placeholder="XXXX-XXXX-XX"></label><div class="settings-actions"><button class="btn btn-primary" data-action="queue-connect">Poveži firmu</button></div>`:`<p class="warning">Automatska adresa Booking API-ja nije dostupna. Povezivanje trenutno nije moguće u ovoj instalaciji.</p>`}</div></section>`;}
function appointmentCard(b){
  return `<div class="booking-item"><span class="time-pill">${safe(b.time)}</span><div class="booking-main"><strong>${safe(b.serviceName)}</strong><small>${safe(b.clientName)} · ${safe(b.duration)} min · ${safe(b.units)} mesto/a</small></div><span class="tag ${safe(b.status)}">${safe(statName[b.status])}</span><button data-action="detail" data-id="${safe(b.id)}" aria-label="Detalji rezervacije">Detalji</button></div>`;
}
function toolbar(week=false){
  const d=week?weekStart(stateUI.date):stateUI.date;
  const label=week?`${formatDate(d)} – ${formatDate(addDays(d,6))}`:formatDate(d);
  return `<div class="toolbar"><div class="date-nav"><button class="icon-btn" data-action="prev" aria-label="Prethodno">‹</button><strong>${safe(label)}</strong><button class="icon-btn" data-action="next" aria-label="Sledeće">›</button></div><button class="today-btn" data-action="today">Danas</button></div>`;
}
function runStats(){const bs=bookings(),day=stateUI.date;
  return {confirmed:bs.filter(b=>b.date===day&&b.status===STATUS.CONFIRMED).length,pending:bs.filter(b=>b.status===STATUS.PENDING).length,week:bs.filter(b=>b.status===STATUS.CONFIRMED&&b.date>=weekStart(day)&&b.date<=addDays(weekStart(day),6)).length};
}
function freeSuggestions(){const p=profile();const day=stateUI.date,now=new Date();const earliest=day===today()?fromMin(Math.min(1425,Math.ceil((now.getHours()*60+now.getMinutes())/15)*15)): '00:00';
  const t={id:'none',date:day,time:earliest,duration:p.services[0]?.duration||30,units:1};
  const s=alternatives(p,bookings(),t,5,1);return s.map(x=>`<button type="button" class="slot-chip" data-action="new-at" data-date="${x.date}" data-time="${x.time}">${x.time}<small>${safe((p.services[0]?.name||'Termin'))}</small></button>`).join('');
}
function renderHome(){const p=profile(),modules=portalModules(p),bs=modules.booking?bookings():[];
  const todayBookings=bs.filter(b=>b.date===stateUI.date&&[STATUS.CONFIRMED,STATUS.PENDING,STATUS.PROPOSED].includes(b.status)).sort((a,b)=>a.time.localeCompare(b.time));
  const attention=bs.filter(b=>[STATUS.PENDING,STATUS.PROPOSED].includes(b.status)).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const connected=Boolean(p.queueConnection);
  if(!modules.booking&&modules.orders)return renderOrdersHome();
  if(!modules.booking)return `<section class="portal-welcome panel"><div class="panel-body"><span class="tiny-label">${connected?'POVEZANA FIRMA':'POSLOVNI PROFIL'}</span><h2>${safe(p.name)}</h2><p class="hint">RMC Business Portal je spreman za poslovne zahteve. Aktivni moduli će se ovde prikazati kada ih firma koristi.</p><div class="portal-status"><span class="status-dot"></span>${connected?'Sajt je povezan sa portalom.':'Poveži poslovni profil u podešavanjima da bi prijem zahteva bio dostupan.'}</div><button class="btn btn-primary" data-action="home-settings">Otvori podešavanja</button></div></section>`;
  const dayLabel=formatDate(stateUI.date);
  return `<div class="portal-overview"><section class="portal-intro"><div><span class="tiny-label">AKTIVNA FIRMA</span><h2>${safe(p.name)}</h2><p>Pregled rezervacija i zahteva za ${safe(dayLabel)}.</p></div><button class="btn btn-primary" data-action="home-reservations">Otvori rezervacije</button></section>
  <div class="stat-grid"><button class="stat-card accent stat-action" data-action="home-reservations" data-tab="requests"><div class="label">Novi zahtevi</div><div class="value">${attention.filter(b=>b.status===STATUS.PENDING).length}</div><div class="foot">Čekaju pregled</div></button><button class="stat-card stat-action" data-action="home-reservations" data-tab="day"><div class="label">Današnje rezervacije</div><div class="value">${todayBookings.filter(b=>b.status===STATUS.CONFIRMED).length}</div><div class="foot">Potvrđeni termini</div></button><button class="stat-card stat-action" data-action="home-reservations" data-tab="requests"><div class="label">Potrebna pažnja</div><div class="value">${attention.length}</div><div class="foot">Zahtevi i predlozi</div></button></div>
  <div class="columns"><section class="panel"><div class="panel-head"><h2>Današnje rezervacije</h2><button class="text-btn" data-action="home-reservations" data-tab="day">Dnevni pregled →</button></div><div class="panel-body">${todayBookings.length?todayBookings.map(appointmentCard).join(''):'<div class="empty">Za danas nema aktivnih rezervacija.</div>'}</div></section><section class="panel"><div class="panel-head"><h2>Sledeće za pregled</h2><button class="text-btn" data-action="home-reservations" data-tab="requests">Svi zahtevi →</button></div><div class="panel-body">${attention.length?attention.slice(0,4).map(appointmentCard).join(''):'<div class="empty">Nema zahteva koji čekaju akciju.</div>'}</div></section></div>
  ${modules.orders?renderOrdersTeaser():''}<div class="portal-status"><span class="status-dot"></span>${connected?'Povezano sa sajtom. Novi zahtevi se proveravaju dok je portal aktivan.':'Portal još nije povezan sa sajtom. Povezivanje je dostupno u Podešavanjima.'}</div></div>`;
}
function orderCard(o){
 const modified=Boolean(o.amendment);
 const items=(modified?orderSelection(o,o.amendment.excludedIndexes).kept:o.items);
 // The traffic light belongs ONLY to Commerce cards. Inquiry cards stay neutral.
 // The color is always accompanied by the actual stored status text.
 const phase=o.type==='INQUIRY'?'inquiry':o.status===ORDER_STATUS.NEW?'new':
  [ORDER_STATUS.ACCEPTED,ORDER_STATUS.PREPARING,ORDER_STATUS.READY].includes(o.status)?'progress':
  o.status===ORDER_STATUS.COMPLETED?'completed':
  [ORDER_STATUS.DECLINED,ORDER_STATUS.CANCELLED].includes(o.status)?'closed':'inquiry';
 const baseLabel=o.type==='ORDER'&&o.status===ORDER_STATUS.COMPLETED?
  (o.fulfillment==='PICKUP'?'Preuzeto':'Završeno'):(ORDER_LABELS[o.status]||o.status);
 const statusLabel=modified?(o.status===ORDER_STATUS.ACCEPTED?'Prihvaćeno sa izmenom':`${baseLabel} · izmenjena`):baseLabel;
 const code=o.type==='INQUIRY'?`UPIT · ${safe(o.orderCode)}`:safe(o.orderCode);
 return `<article class="request-card order-card order-traffic-${phase}"><div class="request-card-head"><span class="order-traffic-label" aria-label="Status: ${safe(statusLabel)}"><span class="order-traffic-dot" aria-hidden="true"></span>${safe(statusLabel)}</span><span class="order-card-code">${code}</span></div><h3>${safe(o.clientName)}</h3><p>${safe(items.map(x=>x.name).slice(0,3).join(' · '))}${items.length>3?' …':''}<br><span class="order-card-count">${items.length} ${items.length===1?'artikal':'artikala'}</span><br><strong>${o.type==='ORDER'?safe(amount(modified?o.amendment.revisedTotal:o.total)):'Upit za dostupnost'}</strong></p><div class="request-card-bottom"><small>${safe(orderWhen(o.createdAt))}</small><button class="tiny" data-action="order-detail" data-id="${safe(o.id)}">Otvori →</button></div></article>`;
}
function renderOrdersTeaser(){const recent=orders().filter(x=>x.status===ORDER_STATUS.NEW).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return `<section class="panel commerce-teaser"><div class="panel-head"><h2>Porudžbine i upiti <span class="tag pending">${recent.length} novih</span></h2><button class="text-btn" data-action="home-orders">Sve porudžbine →</button></div><div class="panel-body">${recent.length?`<div class="request-grid">${recent.slice(0,3).map(orderCard).join('')}</div>`:'<p class="empty">Nema novih Commerce zahteva.</p>'}</div></section>`;}
function renderOrdersHome(){const fresh=orders().filter(x=>x.status===ORDER_STATUS.NEW);return `<div class="portal-overview"><section class="portal-intro"><div><span class="tiny-label">AKTIVNA FIRMA · COMMERCE</span><h2>${safe(profile().name)}</h2><p>Porudžbine i upiti sa sajta, bez automatskog potvrđivanja lagera ili naplate.</p></div><button class="btn btn-primary" data-action="home-orders">Otvori porudžbine</button></section><div class="stat-grid"><button class="stat-card accent stat-action" data-action="home-orders"><div class="label">Novi zahtevi</div><div class="value">${fresh.length}</div><div class="foot">Čekaju pregled</div></button><div class="stat-card"><div class="label">Ukupno primljeno</div><div class="value">${orders().length}</div><div class="foot">Lokalna istorija</div></div></div>${renderOrdersTeaser()}<div class="portal-status"><span class="status-dot"></span>${profile().queueConnection?'Sajt povezan; novi Commerce zahtevi se proveravaju dok je Portal otvoren.':'Poveži sajt u Podešavanjima.'}</div></div>`;}
function renderOrders(){let list=orders().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));const filter=stateUI.orderFilter;if(filter==='open')list=list.filter(x=>x.status===ORDER_STATUS.NEW||x.status===ORDER_STATUS.ACCEPTED||x.status===ORDER_STATUS.PREPARING);else if(filter==='done')list=list.filter(x=>x.status===ORDER_STATUS.COMPLETED||x.status===ORDER_STATUS.ANSWERED);else if(filter==='closed')list=list.filter(x=>x.status===ORDER_STATUS.DECLINED||x.status===ORDER_STATUS.CANCELLED);else if(filter==='ready')list=list.filter(x=>x.status===ORDER_STATUS.READY);return `<div class="toolbar"><strong>${list.length} zahteva</strong><button class="btn btn-light" data-action="queue-sync">Proveri nove</button></div><div class="filter-bar" role="tablist" aria-label="Filtriranje porudžbina">${[['open','Aktivne'],['ready','Spremne'],['done','Završene'],['closed','Odbijene / otkazane'],['all','Sve']].map(([id,label])=>`<button class="filter ${filter===id?'active':''}" data-action="order-filter" data-filter="${id}" role="tab" aria-selected="${filter===id}">${label}</button>`).join('')}</div><p class="hint">Iznosi su informativni; potvrda porudžbine i poruka kupcu su odvojene radnje. Statusi se čuvaju lokalno na ovom uređaju.</p><div class="request-grid">${list.map(orderCard).join('')||'<div class="panel empty">Nema zahteva za izabrani filter.</div>'}</div>`;}
function orderDialog(o){
 const editable=o.type==='ORDER'&&o.status===ORDER_STATUS.NEW;
 const savedRemoved=o.amendment?.excludedIndexes||[];
 const removed=editable?stateUI.orderDraftRemoved:savedRemoved;
 const selected=o.type==='ORDER'?orderSelection(o,removed):null;
 const modified=Boolean(o.amendment);
 const isDifferent=editable&&removed.length>0;
 const possible=o.type==='INQUIRY'?o.status==='new'?['answered','declined']:[]:editable?[]:{accepted:['preparing','cancelled'],preparing:['ready','cancelled'],ready:['completed','cancelled']}[o.status]||[];
 const baseLabel=o.type==='ORDER'&&o.status===ORDER_STATUS.COMPLETED&&o.fulfillment==='PICKUP'?'Preuzeto':(ORDER_LABELS[o.status]||o.status);
 const statusLabel=modified?(o.status==='accepted'?'Prihvaćeno sa izmenom':`${baseLabel} · izmenjena`):baseLabel;
 const lines=o.items.map((item,index)=>{
  const isRemoved=removed.includes(index);
  return `<div class="order-row ${isRemoved?'removed':''}">
   ${/^https:\/\//i.test(item.image)?`<img class="order-row-image" src="${safe(item.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}
   <div class="order-row-info"><strong>${safe(item.name)}</strong>
    ${[item.size,item.variant,item.preparation].filter(Boolean).length?`<span class="order-row-variant">${[item.size,item.variant,item.preparation].filter(Boolean).map(safe).join(' · ')}</span>`:''}
    <span>${safe(item.quantity)} ${safe(item.unit)} × ${safe(amount(item.unitPrice))}</span>
   </div><strong class="order-row-price">${safe(amount(item.lineTotal))}</strong>
   ${editable?`<button type="button" class="order-item-toggle ${isRemoved?'restore':''}" data-action="order-toggle-item" data-index="${index}" aria-pressed="${isRemoved}">${isRemoved?'Vrati':'Nema na stanju'}</button>`:isRemoved?'<span class="order-item-removed">Nije dostupno</span>':''}
  </div>`;
 }).join('');
 const total=o.type==='ORDER'?(editable?selected.revisedTotal:modified?o.amendment.revisedTotal:o.total):null;
 const openDetails=`<div class="order-meta">
  ${o.note?`<div class="order-note"><span>Napomena kupca</span><p>${safe(o.note)}</p></div>`:''}
  <div class="order-meta-line"><span>Preuzimanje / isporuka</span><strong>${safe(o.fulfillment==='PICKUP'?'Lično preuzimanje':o.fulfillment==='AGREEMENT'?'Po dogovoru':'Nije navedeno')}</strong></div>
  <div class="order-meta-line"><span>Telefon kupca</span><a href="tel:${safe(String(o.phone||'').replace(/[^\d+]/g,''))}">${safe(o.phone)}</a></div>
  <div class="order-meta-line quiet"><span>Primljeno</span><span>${safe(orderWhen(o.createdAt))}</span></div>
 </div>`;
 const share=o.status!==ORDER_STATUS.NEW?`<section class="order-share order-message"><strong>Obaveštenje kupcu — ručno slanje</strong>
  <label>Broj primaoca<input type="tel" data-order-phone value="${safe(o.phone)}" autocomplete="tel" placeholder="+381…"></label>
  <textarea class="message-preview" readonly>${safe(orderReplyText(o,o.status))}</textarea>
  <p class="hint">Portal priprema poruku; otvaranje WhatsApp-a ili Vibera nije potvrda slanja.</p>
 </section>`:'';
 return `<div class="dialog-head order-dialog-head"><div><h2>${o.type==='INQUIRY'?'UPIT ':''}${safe(o.orderCode)}</h2><div class="order-customer-title">${safe(o.clientName)}</div><span class="tag ${safe(o.status)}">${safe(statusLabel)}</span></div><button class="close" data-action="close-dialog" aria-label="Zatvori">×</button></div>
 <div class="dialog-body order-dialog-body">
  <section class="order-products" aria-label="${o.type==='INQUIRY'?'Traženi':'Naručeni'} artikli"><h3>Artikli</h3><div class="order-list">${lines}</div>
  ${isDifferent?`<div class="order-draft-note" role="status">Označeno kao nedostupno: ${removed.length}. Originalna porudžbina ostaje sačuvana.</div>`:''}
  </section>
  ${o.type==='ORDER'?`<div class="order-total"><span>${isDifferent||modified?'Informativni iznos posle izmene':'Informativni iznos'}</span><strong>${safe(amount(total))}</strong></div>${isDifferent||modified?`<div class="order-original-total">Prvobitno: ${safe(amount(o.total))}</div>`:''}`:''}
  ${openDetails}
  ${share}
 </div>
 <div class="order-modal-footer">
  ${editable?`<button type="button" class="btn btn-danger" data-action="order-status" data-status="declined">Odbijeno</button>
    <button type="button" class="btn btn-primary" data-action="order-status" data-status="accepted" ${isDifferent?'disabled title="Prvo vrati uklonjene artikle ili prihvati sa izmenom"':''}>Prihvaćeno</button>
    <button type="button" class="btn btn-soft" data-action="order-accept-modified" ${!isDifferent||!selected.kept.length?'disabled':''}>Prihvaćeno sa izmenom</button>`:
    possible.length?possible.map(next=>`<button type="button" class="btn ${next==='declined'||next==='cancelled'?'btn-danger':'btn-primary'}" data-action="order-status" data-status="${next}">${safe(ORDER_LABELS[next])}</button>`).join(''):''}
  ${o.status!==ORDER_STATUS.NEW?`<div class="order-share-actions"><button class="btn share-whatsapp" data-action="order-whatsapp">WhatsApp ↗</button><button class="btn share-viber" data-action="order-viber">Viber ↗</button><button class="btn btn-light" data-action="order-copy">Kopiraj</button></div>`:''}
 </div>`;
}
function rerenderOrderDialog(){
 const o=orderById(stateUI.selectedOrderId);if(!o)return;
 byId('order-details').innerHTML=orderDialog(o);
}
function openOrderDetails(id){
 const o=orderById(id);if(!o)return;
 stateUI.selectedOrderId=id;stateUI.orderDraftRemoved=[];
 rerenderOrderDialog();byId('order-dialog').showModal();
}
function toggleOrderItem(index){
 const o=orderById(stateUI.selectedOrderId);
 if(o?.type!=='ORDER'||o.status!==ORDER_STATUS.NEW||!Number.isInteger(index)||index<0||index>=o.items.length)throw new Error('Nije moguće promeniti ovaj artikal.');
 const i=stateUI.orderDraftRemoved.indexOf(index);
 if(i>=0)stateUI.orderDraftRemoved.splice(i,1);else stateUI.orderDraftRemoved.push(index);
 rerenderOrderDialog();
}
async function saveOrderDecision(updated,original,message){
 const index=state.orders.indexOf(original);
 state.orders[index]=updated;
 try{await persistStrict();}catch(error){state.orders[index]=original;throw error;}
 stateUI.orderDraftRemoved=[];refresh();rerenderOrderDialog();toast(message);
}
async function acceptModifiedOrder(){
 const original=orderById(stateUI.selectedOrderId);
 if(!original)throw new Error('Porudžbina nije pronađena.');
 const updated=acceptOrderWithAmendment(original,stateUI.orderDraftRemoved);
 await saveOrderDecision(updated,original,'Izmena je sačuvana. Pošalji obaveštenje kupcu.');
}
async function changeOrderStatus(next){
 const original=orderById(stateUI.selectedOrderId);if(!original)throw new Error('Porudžbina nije pronađena.');
 if(next==='accepted'&&stateUI.orderDraftRemoved.length)throw new Error('Postoje uklonjeni artikli: izaberi Prihvaćeno sa izmenom ili vrati artikle.');
 if(['declined','cancelled'].includes(next)&&!window.confirm('Da li potvrđuješ ovu odluku?'))return;
 const updated=nextOrderStatus(original,next);
 await saveOrderDecision(updated,original,'Status je sačuvan. Ako je potrebno, pošalji poruku kupcu.');
}
function shareOrder(channelName){
 const o=orderById(stateUI.selectedOrderId);if(!o||o.status===ORDER_STATUS.NEW)throw new Error('Prvo odluči o zahtevu.');
 const msg=orderReplyText(o,o.status),phone=byId('order-details').querySelector('[data-order-phone]')?.value.trim()||o.phone;
 if(channelName==='copy')return copyText(msg);
 if(channelName==='whatsapp'){
  if(!hasWhatsAppRecipient(phone))throw new Error('Unesi validan WhatsApp broj sa pozivnim brojem.');
  window.open(whatsappUrl(phone,msg),'_blank','noopener,noreferrer');toast('WhatsApp je otvoren; pošalji poruku ručno.');
 }else{window.location.href=viberUrl(msg);toast('Viber je otvoren. Proveri primaoca i pošalji ručno.');}
}
function renderReservations(){const tabs=[['requests','Zahtevi'],['day','Dan'],['week','Nedelja']];const content={requests:renderRequests,day:renderDay,week:renderWeek}[stateUI.reservationTab]||renderRequests;return `<div class="reservation-tabs" role="tablist" aria-label="Prikazi rezervacija">${tabs.map(([id,label])=>`<button class="filter ${stateUI.reservationTab===id?'active':''}" data-action="reservation-tab" data-tab="${id}" role="tab" aria-selected="${stateUI.reservationTab===id}">${label}</button>`).join('')}</div>${content()}`;}
function renderDay(){const bs=bookings().filter(b=>b.date===stateUI.date),st=runStats();const visible=bs.filter(b=>b.status===STATUS.CONFIRMED||b.status===STATUS.PENDING||b.status===STATUS.PROPOSED).sort((a,b)=>a.time.localeCompare(b.time));
  const booked=bs.filter(b=>b.status===STATUS.CONFIRMED).sort((a,b)=>a.time.localeCompare(b.time));const waiting=bs.filter(b=>b.status===STATUS.PENDING).sort((a,b)=>a.time.localeCompare(b.time));
  return `${toolbar()}<div class="stat-grid"><div class="stat-card accent"><div class="label">Potvrđeno tog dana</div><div class="value">${st.confirmed}</div><div class="foot">Zakazani termini</div></div><div class="stat-card"><div class="label">Čekaju odgovor</div><div class="value">${st.pending}</div><div class="foot">Ukupno otvorenih zahteva</div></div><div class="stat-card"><div class="label">Potvrđeno ove nedelje</div><div class="value">${st.week}</div><div class="foot">Kalendar: ${safe(profile().name)}</div></div></div>
  <div class="columns"><section class="panel"><div class="panel-head"><h2>Termini za izabrani dan</h2><span class="tiny-label">${visible.length} ukupno</span></div><div class="panel-body">${visible.length?visible.map(appointmentCard).join(''):'<div class="empty"><div class="empty-icon">▤</div>Za ovaj dan nema rezervacija.<br>Dodaj test zahtev da proverimo kalendar.</div>'}</div></section>
  <section class="panel"><div class="panel-head"><h2>Sledeći slobodni termini</h2><span class="tiny-label">TEST</span></div><div class="panel-body"><p class="hint">Predlog za prvu uslugu (${profile().services[0]?safe(profile().services[0].duration)+' min':'dodaj uslugu'}). Nije javno prikazana raspoloživost.</p><div class="slot-chips">${freeSuggestions()||'<span class="hint">Nema dostupnih termina tog dana.</span>'}</div><div class="helper-box">Zahtev ne blokira termin. Samo potvrđena rezervacija zauzima kapacitet kalendara.</div></div></section></div>
  ${(waiting.length?`<div class="panel" style="margin-top:19px"><div class="panel-head"><h2>Potrebna potvrda</h2><button class="text-btn" data-action="view-requests">Svi zahtevi →</button></div><div class="panel-body">${waiting.map(appointmentCard).join('')}</div></div>`:'')}`;
}
function renderWeek(){const start=weekStart(stateUI.date);return `${toolbar(true)}<div class="panel"><div class="panel-head"><h2>Nedelja</h2><span class="tiny-label">KLIK ZA DAN</span></div><div class="panel-body"><div class="week-grid">${Array.from({length:7},(_,i)=>{const d=addDays(start,i),arr=bookings().filter(b=>b.date===d),confirmed=arr.filter(b=>b.status===STATUS.CONFIRMED).length,pending=arr.filter(b=>b.status===STATUS.PENDING).length;return `<button class="day-card ${d===stateUI.date?'selected':''}" data-action="choose-day" data-date="${d}"><div class="day-name">${DAYS[i]}</div><div class="day-num">${Number(d.slice(-2))}</div><span class="week-pill">${confirmed} potvrđeno</span>${pending?`<span class="week-pill secondary">${pending} čeka</span>`:''}</button>`;}).join('')}</div></div></div><div class="helper-box">Nedelja prikazuje potvrđene rezervacije i zahteve. Detalje proveravaš u dnevnom prikazu.</div>`;}
function renderRequests(){let bs=bookings().sort((a,b)=>{const rank={pending:0,proposed:1,confirmed:2,declined:3,cancelled:4};return rank[a.status]-rank[b.status]||b.createdAt.localeCompare(a.createdAt);});
  if(stateUI.filter!=='all')bs=bs.filter(b=>b.status===stateUI.filter);
  return `<div class="toolbar"><strong>${bs.length} zahteva</strong></div><div class="filter-bar">${[['all','Svi'],['pending','Čekaju'],['confirmed','Potvrđeni'],['proposed','Predlozi'],['cancelled','Otkazani'],['declined','Odbijeni']].map(([id,label])=>`<button class="filter ${stateUI.filter===id?'active':''}" data-action="filter" data-filter="${id}">${label}</button>`).join('')}</div><div class="request-grid">${bs.map(b=>`<article class="request-card"><div class="request-card-head"><span class="tag ${safe(b.status)}">${safe(statName[b.status])}</span><span class="tiny-label">${safe(b.source==='manual'?'RUČNI UNOS':b.source==='test-json'?'TEST':'SAJT')}</span></div><h3>${safe(b.clientName)}</h3><p>${safe(b.serviceName)}<br>${safe(summaryLine(b))}</p>${b.proposal?`<p style="color:#2d8e86">Predlog: ${safe(formatDate(b.proposal.date))} u ${safe(b.proposal.time)}</p>`:''}<div class="request-card-bottom"><small>${safe(b.phone||'Bez telefona')}</small><button class="tiny" data-action="detail" data-id="${safe(b.id)}">Otvori →</button></div></article>`).join('')||'<div class="panel empty">Nema zahteva za izabrani filter.</div>'}</div>`;}
function detailRows(values){return values.filter(([,value])=>value).map(([label,value])=>`<div><small>${safe(label)}</small><strong>${safe(value)}</strong></div>`).join('');}
function operationalEditor(p){if(stateUI.settingsEditor!=='rules')return '';return `<section class="settings-card"><div class="card-head"><div><span class="tiny-label">KAPACITET REZERVACIJA</span><h2>Pravila zauzetosti</h2></div><button class="text-btn" data-action="settings-close">Zatvori</button></div><div class="form-grid"><label>Istovremeni kapacitet<input type="number" id="set-capacity" min="1" max="99" value="${p.capacity}"></label><label>Korak termina<select id="set-slot">${[15,30,60].map(n=>`<option value="${n}" ${p.slotStep===n?'selected':''}>${n} minuta</option>`).join('')}</select></label><label>Pauza između potvrđenih rezervacija<select id="set-buffer">${[0,5,10,15,30,60].map(n=>`<option value="${n}" ${p.buffer===n?'selected':''}>${n} minuta</option>`).join('')}</select></label></div><div class="settings-actions"><button class="btn btn-primary" data-action="save-rules">Sačuvaj pravila</button></div></section>`;}
function serviceSummaryCard(p){const connected=Boolean(p.siteProfile),active=connected?p.services.filter(s=>s.siteServiceId):p.services;return `<section class="settings-card"><div class="card-head"><div><span class="tiny-label">${connected?'USLUGE SA SAJTA':'USLUGE'}</span><h2>${connected?'Aktivne usluge':'Lokalne usluge'}</h2></div><button class="btn btn-light" data-action="settings-open" data-editor="services">${connected?'Pregledaj usluge':'Uredi usluge'}</button></div><p class="hint">${active.map(s=>safe(s.name)).join(' · ')||'Nema aktivnih usluga.'}</p></section>`;}function serviceEditor(p){const connected=Boolean(p.siteProfile),visibleServices=connected?p.services.filter(s=>s.siteServiceId):p.services;return `<section class="settings-card"><div class="card-head"><div><span class="tiny-label">${connected?'USLUGE SA SAJTA':'USLUGE'}</span><h2>${connected?'Aktivne usluge':'Uredi usluge'}</h2></div>${!connected?'<button class="text-btn" data-action="add-service">＋ Dodaj uslugu</button>':''}</div><div class="service-summary">${visibleServices.map(s=>connected?`<label class="service-readonly"><span><strong>${safe(s.name)}</strong><small>${safe(s.siteServiceId||'Lokalna usluga')}</small></span><span><input class="field service-duration" data-service-id="${safe(s.id)}" type="number" min="5" max="1440" step="5" value="${s.duration}" aria-label="Trajanje za ${safe(s.name)}"> min</span></label>`:serviceRow(s)).join('')}</div><p class="hint">${connected?'Nazivi i ID-jevi usluga preuzimaju se sa sajta. Lokalno možeš podesiti trajanje, bez menjanja postojećih rezervacija.':'Ovaj profil još nije povezan sa sajtom; ovde uređuješ lokalne usluge.'}</p><div class="settings-actions"><button class="btn btn-primary" data-action="save-services">Sačuvaj trajanja</button></div></section>`;}
function renderSettings(){const p=profile(),connected=Boolean(p.queueConnection),site=p.siteProfile?.business||{},isAuto=Boolean(p.siteProfile),modules=portalModules(p);const contactRows=detailRows([['Telefon',site.phone],['E-pošta',site.email],['Adresa',[site.address,site.city].filter(Boolean).join(', ')]]);
 return `<div class="settings-stack"><section class="settings-card"><div class="card-head"><div><span class="tiny-label">POSLOVNI PROFIL</span><h2>${safe(isAuto?site.name:p.name)}</h2></div>${isAuto?'<span class="profile-source">Preuzeto sa sajta</span>':'<button class="text-btn" data-action="settings-open" data-editor="profile">Izmeni naziv</button>'}</div>${contactRows?`<div class="profile-details">${contactRows}</div>`:isAuto?'<p class="hint">Osnovni poslovni profil i usluge preuzeti su sa povezanog sajta.</p>':'<p class="hint">Ovaj lokalni profil još nema podatke preuzete sa sajta. Povezivanje će sačuvati lokalne rezervacije.</p>'}${stateUI.settingsEditor==='profile'?`<label>Naziv firme<input id="set-name" value="${safe(p.name)}" maxlength="100"></label><div class="settings-actions"><button class="btn btn-primary" data-action="save-profile-name">Sačuvaj naziv</button><button class="btn btn-light" data-action="settings-close">Odustani</button></div>`:''}</section>
 ${modules.orders?`<section class="settings-card"><div class="card-head"><div><span class="tiny-label">COMMERCE SA SAJTA</span><h2>Aktivni katalog</h2></div><span class="profile-source">Preuzeto sa sajta</span></div><p class="hint">Proizvoda: ${p.siteProfile.commerce.products.length}. Cene i nazivi preuzimaju se iz generatora, ne menjaju se lokalno u Portalu.</p></section>`:''}
 ${modules.booking?`<section class="settings-card"><div class="card-head"><div><span class="tiny-label">REZERVACIJE</span><h2>Kapacitet i trajanje</h2></div><button class="btn btn-light" data-action="settings-open" data-editor="rules">Uredi</button></div><p class="hint">Kapacitet: ${p.capacity} · korak: ${p.slotStep} min · razmak: ${p.buffer} min</p></section>${operationalEditor(p)}${serviceSummaryCard(p)}${stateUI.settingsEditor==='services'?serviceEditor(p):''}`:''}
 <section class="settings-card"><div class="card-head"><div><span class="tiny-label">POVEZIVANJE I OBAVEŠTENJA</span><h2>${connected?'Sajt je povezan':'Povežite svoj sajt'}</h2></div><span class="connection-status ${connected?'connected':''}">${connected?'Povezano':'Nije povezano'}</span></div>${connected?`<div class="profile-details"><div><small>Povezani sajt</small><strong>${safe(site.name||p.name)}</strong></div><div><small>Push obaveštenja</small><strong>${p.pushEnabledAt?'Uključena na ovom uređaju':'Nisu uključena'}</strong></div></div><div class="settings-actions"><button class="btn btn-primary" data-action="push-enable">${p.pushEnabledAt?'Push obaveštenja uključena':'Uključi Push obaveštenja'}</button><button class="btn btn-light" data-action="queue-sync">Proveri nove zahteve</button></div><div class="settings-actions unlink-row"><button class="btn btn-danger" data-action="queue-disconnect">Prekini vezu sa sajtom</button></div><p class="hint">Rezervacije ostaju na ovom uređaju. Za nove zahteve biće potreban nov jednokratni kod.</p>`:apiDefault?`<p class="hint">Unesi jednokratni kod sa privatnog završnog ekrana generatora.</p><label>Jednokratni kod<input id="queue-code" autocapitalize="characters" autocomplete="off" maxlength="12" placeholder="XXXX-XXXX-XX"></label><div class="settings-actions"><button class="btn btn-primary" data-action="queue-connect">Poveži firmu</button></div>`:`<p class="warning">Automatska adresa Booking API-ja nije dostupna. Povezivanje trenutno nije moguće u ovoj instalaciji.</p>`}<p id="queue-status" class="hint"></p></section>
 <section class="settings-card"><div class="card-head"><div><span class="tiny-label">REZERVNA KOPIJA</span><h2>Sačuvajte lokalne podatke</h2></div></div><p class="hint">Rezervacije, porudžbine i podešavanja ostaju na ovom uređaju. Vraćanje kopije zamenjuje postojeće lokalne podatke nakon potvrde.</p><div class="settings-actions"><button class="btn btn-light" data-action="export">↧ Izvezi rezervnu kopiju</button><button class="btn btn-light" data-action="import">↥ Vrati kopiju</button></div></section></div>`;}
function saveRules(){const p=profile(),capacity=Number(byId('set-capacity').value);if(!Number.isInteger(capacity)||capacity<1||capacity>99)throw new Error('Kapacitet mora biti od 1 do 99.');Object.assign(p,{capacity,slotStep:Number(byId('set-slot').value),buffer:Number(byId('set-buffer').value)});persist();stateUI.settingsEditor='';refresh();toast('Pravila rezervacija sačuvana.');}
function saveServices(){const p=profile(),connected=Boolean(p.siteProfile);const rows=connected?[...document.querySelectorAll('.service-duration')].map(input=>({id:input.dataset.serviceId,duration:Number(input.value)})):[...document.querySelectorAll('.service-row')].map(row=>({id:row.dataset.serviceId,name:row.querySelector('[data-field="name"]').value.trim(),duration:Number(row.querySelector('[data-field="duration"]').value),units:Number(row.querySelector('[data-field="units"]').value)}));if(!rows.length)throw new Error('Potrebna je bar jedna usluga.');for(const row of rows){if(!Number.isInteger(row.duration)||row.duration<5||row.duration>1440)throw new Error('Trajanje mora biti od 5 do 1440 minuta.');const service=p.services.find(x=>x.id===row.id);if(!service)throw new Error('Usluga nije pronađena.');if(!connected&&(!row.name||row.name.length>90||!Number.isInteger(row.units)||row.units<1||row.units>p.capacity))throw new Error('Proveri naziv usluge i potreban kapacitet.');Object.assign(service,row);}persist();refresh();toast('Usluge sačuvane.');}
function saveProfileName(){const p=profile(),name=byId('set-name').value.trim();if(name.length<2||name.length>100)throw new Error('Unesi naziv firme (2–100 znakova).');p.name=name;persist();stateUI.settingsEditor='';refresh();toast('Naziv firme sačuvan.');}function serviceRow(s={id:makeId(),name:'',duration:30,units:1}){return `<div class="service-row" data-service-id="${safe(s.id)}"><input class="field" data-field="name" maxlength="90" placeholder="Naziv usluge" value="${safe(s.name)}" aria-label="Naziv usluge"><input class="field" data-field="duration" type="number" min="5" max="1440" step="5" value="${s.duration}" aria-label="Trajanje u minutima"><input class="field" data-field="units" type="number" min="1" max="99" value="${s.units||1}" aria-label="Potrebni resursi"><button class="service-remove" data-action="remove-service" title="Ukloni uslugu" aria-label="Ukloni uslugu">×</button></div>`;}
function openNew(date=stateUI.date,time='10:00'){
  const p=profile();byId('request-form').reset();byId('new-service').innerHTML=p.services.map(s=>`<option value="${safe(s.id)}">${safe(s.name)} · ${s.duration} min</option>`).join('');
  byId('new-date').value=date;byId('new-time').value=time;byId('new-units').max=p.capacity;byId('new-units').value=p.services[0]?.units||1;checkNew();byId('request-dialog').showModal();
}
function checkNew(){const p=profile(),s=serviceOf(byId('new-service').value),el=byId('new-slot-feedback');if(!s)return;
  const r=slotCheck(p,bookings(),{date:byId('new-date').value,time:byId('new-time').value,duration:s.duration,units:Number(byId('new-units').value)});
  el.className=`feedback ${r.ok?'':'bad'}`;el.textContent=r.ok?'✓ Termin je trenutno slobodan. Potvrda je ipak potrebna.':`! ${r.reason} Zahtev možeš sačuvati, pa ponuditi alternativu.`;
}
function createNew(e){e.preventDefault();try{const p=profile();const fd=new FormData(e.currentTarget);const b=normalizeRequest(Object.fromEntries(fd),p);if(state.bookings.some(x=>x.id===b.id))throw new Error('Ovaj zahtev već postoji.');state.bookings.push(b);persist();byId('request-dialog').close();stateUI.view='reservations';stateUI.reservationTab='requests';refresh();openDetails(b.id);toast('Zahtev sačuvan. Termin još nije potvrđen.');}catch(e){toast(e.message);}}
function detailGrid(b,{includeStatus=true}={}){const code=b.reservationCode||'Starija rezervacija';return `<div class="detail-grid"><div class="detail-cell"><small>Klijent</small><strong>${safe(b.clientName)}</strong></div><div class="detail-cell"><small>Telefon</small><strong>${safe(b.phone||'Nije unet')}</strong></div><div class="detail-cell"><small>Rezervacioni kod</small><strong>${safe(code)}</strong></div><div class="detail-cell"><small>Usluga</small><strong>${safe(b.serviceName)}</strong></div><div class="detail-cell"><small>Traženi termin</small><strong>${safe(scheduleText(b))}</strong></div><div class="detail-cell"><small>Trajanje / resursi</small><strong>${safe(b.duration)} min / ${safe(b.units)}</strong></div>${includeStatus?`<div class="detail-cell"><small>Status</small><strong>${safe(statName[b.status])}</strong></div>`:''}</div>${b.notes?`<div class="detail-cell"><small>Napomena</small><strong style="white-space:pre-wrap;font-weight:500">${safe(b.notes)}</strong></div>`:''}`;}
function openDetails(id){const b=reservation(id);if(!b)return;stateUI.selectedId=id;stateUI.proposal=b.proposal?clone(b.proposal):null;
  const dayPart=b.timingMode==='DAY_PART';
  byId('booking-dialog').classList.toggle('daypart-compact',dayPart);
  if(dayPart){
    byId('booking-details').innerHTML=dayPartDetailHtml({b,safe,formatDate,dayPartLabel,today,detailGrid,shareActions,STATUS});
    byId('booking-dialog').showModal();return;
  }
  const original=slotCheck(profile(),bookings(),{...b,excludeId:b.id});const options=alternatives(profile(),bookings(),b,4,14);
  const proposalChoices=((b.proposal?[b.proposal]:[]).concat(options.filter(x=>!b.proposal||x.date!==b.proposal.date||x.time!==b.proposal.time)).map(x=>`<button data-action="choose-proposal" data-date="${x.date}" data-time="${x.time}" class="${stateUI.proposal?.date===x.date&&stateUI.proposal?.time===x.time?'selected':''}">${safe(formatDate(x.date))}<br><b>${x.time}</b></button>`).join('')||'<span class="hint">Nema alternativa u narednih 14 dana.</span>');
  byId('booking-details').innerHTML=`<div class="dialog-head"><div><div class="eyebrow">ZAHTEV / ${safe(b.source==='manual'?'RUČNI UNOS':'TEST')}</div><h2>${safe(b.clientName)}</h2></div><button class="close" data-action="close-dialog" aria-label="Zatvori">×</button></div>
  <div class="dialog-body">${detailGrid(b)}
  ${b.status===STATUS.CONFIRMED?'<div class="success">✓ Termin zauzima kapacitet u lokalnom kalendaru.</div>':b.status===STATUS.CANCELLED||b.status===STATUS.DECLINED?'<div class="warning">Ovaj zahtev je zatvoren i ne zauzima termin.</div>':`<div class="${original.ok?'success':'warning'}">${original.ok?'✓ Traženi termin je trenutno slobodan.':'! '+safe(original.reason)+' Možeš ponuditi prvi slobodan termin.'}</div>`}
  ${(b.status===STATUS.PENDING||b.status===STATUS.PROPOSED)?`<div class="proposal-box"><h3>Predloži drugi termin</h3><div class="proposal-pills">${proposalChoices}</div><p>Predloženi termin se ne rezerviše dok ne stigne potvrda klijenta.</p><p id="proposal-feedback" class="feedback" aria-live="polite"></p></div>`:''}
  ${(b.status===STATUS.PROPOSED&&b.proposal)?`<div class="helper-box">Poslednji predlog: ${safe(formatDate(b.proposal.date))} u ${safe(b.proposal.time)}. Ako je klijent prihvatio, potvrdi predloženi termin.</div>`:''}
  <div class="helper-box">Predlog ne zauzima termin dok ga ne potvrdiš. Poruke se ne šalju automatski.</div></div>
  ${shareActions(b)}
  <div class="dialog-actions" style="justify-content:space-between"><div class="detail-actions">
  ${b.status===STATUS.PENDING||b.status===STATUS.PROPOSED?`<button class="btn btn-primary" data-action="confirm-booking" ${!original.ok?'disabled':''}>✓ Potvrdi traženi</button><button class="btn btn-soft" data-action="save-proposal" ${!stateUI.proposal?'disabled':''}>Predloži termin</button><button class="btn btn-light" data-action="confirm-proposal" ${!b.proposal?'disabled':''}>Potvrdi predlog</button>`:''}
  ${b.status===STATUS.CONFIRMED?'<button class="btn btn-light" data-action="ics">↓ Dodaj u moj kalendar</button>':''}
  ${b.status===STATUS.PENDING?'<button class="btn btn-danger" data-action="decline-booking">Odbij</button>':''}
  ${b.status===STATUS.CONFIRMED||b.status===STATUS.PROPOSED?'<button class="btn btn-danger" data-action="cancel-booking">Otkaži</button>':''}
  </div></div>`;
  byId('booking-dialog').showModal();
}
function rerenderDetails(){if(stateUI.selectedId){byId('booking-dialog').close();openDetails(stateUI.selectedId);}}
function chooseProposal(date,time){const b=reservation(stateUI.selectedId),r=slotCheck(profile(),bookings(),{date,time,duration:b.duration,units:b.units,excludeId:b.id}),feedback=byId('proposal-feedback');if(!r.ok){if(feedback){feedback.className='feedback bad';feedback.textContent='! '+r.reason;}return;}
  if(feedback){feedback.className='feedback';feedback.textContent='✓ Termin je slobodan. Sada možeš poslati predlog.';}stateUI.proposal={date,time};byId('booking-dialog').querySelectorAll('[data-action="choose-proposal"]').forEach(el=>el.classList.toggle('selected',el.dataset.date===date&&el.dataset.time===time));const button=byId('booking-dialog').querySelector('[data-action="save-proposal"]');if(button)button.disabled=false;
}
async function saveDayPartProposal(){
 const b=reservation(stateUI.selectedId);
 if(!b||b.timingMode!=='DAY_PART'||![STATUS.PENDING,STATUS.PROPOSED].includes(b.status))throw new Error('Zahtev nema otvoren predlog.');
 const date=byId('daypart-proposal-date')?.value,time=byId('daypart-proposal-time')?.value;
 const result=slotCheck(profile(),bookings(),{date,time,duration:b.duration,units:b.units,excludeId:b.id});
 if(!result.ok){const el=byId('proposal-feedback');if(el){el.hidden=false;el.textContent=result.reason;}return;}
 const previous={status:b.status,proposal:b.proposal&&clone(b.proposal),updatedAt:b.updatedAt};
 b.status=STATUS.PROPOSED;b.proposal={date,time};b.updatedAt=isoNow();
 try{await persistStrict();}catch(error){Object.assign(b,previous);throw error;}
 refresh();rerenderDetails();toast('Predlog je sačuvan. Izaberi kanal i pošalji poruku klijentu.');
}
function mutateBooking(action){const b=reservation(stateUI.selectedId);if(!b)return;
  if(action==='confirm-booking'){
    if(![STATUS.PENDING,STATUS.PROPOSED].includes(b.status))throw new Error('Zahtev nije otvoren.');
    const r=slotCheck(profile(),bookings(),{...b,excludeId:b.id});if(!r.ok)throw new Error(r.reason);
    b.status=STATUS.CONFIRMED;b.proposal=null;
  }else if(action==='save-proposal'){
    if(![STATUS.PENDING,STATUS.PROPOSED].includes(b.status)||!stateUI.proposal)throw new Error('Izaberi predlog termina.');
    const r=slotCheck(profile(),bookings(),{...stateUI.proposal,duration:b.duration,units:b.units,excludeId:b.id});if(!r.ok)throw new Error(r.reason);
    b.status=STATUS.PROPOSED;b.proposal=clone(stateUI.proposal);
  }else if(action==='confirm-proposal'){
    if(b.status!==STATUS.PROPOSED||!b.proposal)throw new Error('Nema sačuvanog predloga.');
    const r=slotCheck(profile(),bookings(),{...b.proposal,duration:b.duration,units:b.units,excludeId:b.id});if(!r.ok)throw new Error('Predloženi termin više nije slobodan: '+r.reason);
    if(b.timingMode==='DAY_PART'){b.requestedDate=b.requestedDate||b.date;b.requestedDayPart=b.requestedDayPart||b.dayPart;}
    b.date=b.proposal.date;b.time=b.proposal.time;b.proposal=null;b.status=STATUS.CONFIRMED;
  }else if(action==='cancel-booking'){
    if(!window.confirm('Otkaži ovu rezervaciju?'))return;
    b.status=STATUS.CANCELLED;
  }else if(action==='decline-booking'){
    if(!window.confirm('Odbij ovaj zahtev?'))return;
    b.status=STATUS.DECLINED;
  }
  b.updatedAt=isoNow();persist();refresh();rerenderDetails();toast(action==='save-proposal'?'Predlog pripremljen. Izaberi WhatsApp ili Viber.':'Status ažuriran. Ako treba, pošalji poruku klijentu.');
}
function exportState(){download(`RMC_BUSINESS_PORTAL_BACKUP_${today()}.json`,'application/json',JSON.stringify({...state,savedAt:isoNow()},null,2));toast('Kopija preuzeta. Sačuvaj je na sigurnom mestu.');}
async function importState(file){if(!file)return;if(file.size>25*1024*1024)throw new Error('Datoteka je prevelika.');const contents=await file.text(),parsed=validateImport(JSON.parse(contents));if(!window.confirm('UVOZ ZAMENJUJE SVE postojeće lokalne podatke, uključujući sve firme, rezervacije i porudžbine. Nastaviti?'))return;
  state=parsed;if(!state.profiles.find(x=>x.id===state.activeProfileId))state.activeProfileId=state.profiles[0].id;await persist();refresh();toast('Rezervna kopija uspešno učitana.');
}
async function createProfilePairing(){
 const p=profile();
 if(p.pairing?.privateJwk&&!window.confirm('Novi ključ će učiniti SVE ranije generisane Booking linkove nečitljivim. Moraćeš da ponovo generišeš povezane sajtove. Zaista promeniti ključ?'))return;
 if(!globalThis.crypto?.subtle)throw new Error('Povezivanje zahteva HTTPS ili localhost.');
 const pair=await createPairing(p.id);
 p.pairing=pair;await persist();refresh();toast('Javni kod je spreman. Kopiraj ga u Web Solutions Advisor.');
}
async function copyPairing(){
 const token=profile().pairing?.publicToken;if(!token)throw new Error('Prvo poveži firmu.');
 const el=byId('public-pairing-code');if(el){el.focus();el.select();}
 try{await navigator.clipboard.writeText(token);toast('Javni kod kopiran. Nalepi u Web Solutions Advisor.');}
 catch{window.prompt('Kopiraj JAVNI kod za Advisor:',token);}
}
const vapidBytes=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),char=>char.charCodeAt(0));
async function enablePush(){
 const p=profile(),connection=p.queueConnection;
 if(!connection)throw new Error('Prvo poveži firmu kratkim kodom.');
 if(!('Notification' in window)||!('PushManager' in window)||!serviceWorkerReady)throw new Error('Ovaj preglednik trenutno ne podržava Push obaveštenja u Booking Manageru.');
 if(await Notification.requestPermission()!=='granted')throw new Error('Dozvola za obaveštenja nije odobrena.');
 const registration=await serviceWorkerReady,publicKey=await getPushPublicKey(connection);
 const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(publicKey)});
 await subscribePush(connection,subscription.toJSON());p.pushEnabledAt=isoNow();await persist();refresh();toast('Push obaveštenja su uključena na ovom uređaju.');
}
async function importSecureRequest(raw){
 const {profile:p,payload}=await openEncryptedLink(raw,state.profiles);
 if(state.bookings.some(b=>b.sourceRequestId===payload.requestId)){
  const existing=state.bookings.find(b=>b.sourceRequestId===payload.requestId);
  state.activeProfileId=existing.profileId;stateUI.view='reservations';stateUI.reservationTab='requests';refresh();openDetails(existing.id);
  toast('Zahtev je već u kalendaru. Duplikat nije dodat.');return;
 }
 const service=p.services.find(x=>x.name.toLocaleLowerCase('sr').trim()===payload.serviceName.toLocaleLowerCase('sr').trim());
 if(!service)throw new Error('Usluga „'+payload.serviceName.slice(0,65)+'” ne postoji u kalendaru „'+p.name+'”. Dodaj istu uslugu u podešavanjima, pa ponovo uvezi link.');
 if(!payload.phone.trim()||payload.phone.length>45)throw new Error('Zahtev sa sajta mora imati telefon klijenta.');
 const candidate=normalizeRequest({serviceId:service.id,clientName:payload.clientName,phone:payload.phone,date:payload.date,time:payload.time,notes:payload.notes||'',units:Math.max(1,Number(payload.units)||1),source:'site-encrypted'},p);
 candidate.sourceRequestId=payload.requestId;
 state.bookings.push(candidate);state.activeProfileId=p.id;stateUI.view='reservations';stateUI.reservationTab='requests';await persist();refresh();openDetails(candidate.id);
 const check=slotCheck(p,bookings(),{...candidate,excludeId:candidate.id});
 toast(check.ok?'Šifrovani zahtev uvezen. Termin čeka tvoju potvrdu.':'Zahtev je uvezen, ali je traženi termin zauzet. Predloži drugi.');
}
async function promptSecureImport(){
 const raw=window.prompt('Nalepi ceo Booking link iz Vibera/WhatsAppa ili šifrovani kod B1.... Nema potrebe da prepisuješ podatke.');
 if(raw===null||!raw.trim())return;
 await importSecureRequest(raw.trim());
}
async function handleDirectLink(){
 if(!pendingIncoming)return;
 const token=pendingIncoming;
 try{await importSecureRequest('B1.'+token.slice(3));history.replaceState(null,'',location.pathname+location.search);pendingIncoming=null;}
 catch(e){
  byId('notice').innerHTML='<div class="helper-box"><strong>Primljen je Booking link, ali ga ovaj pregledac ne moze obraditi.</strong><br><span id="import-error-text"></span><p>Ako imas instalirani Booking Manager, otvori ga i izaberi „Uvezi Booking link“. Kopiraj ceo link sa ove stranice.</p><button class="btn btn-light" id="copy-incoming-booking" type="button">Kopiraj ulazni link</button></div>';
  byId('import-error-text').textContent=e.message;
  byId('copy-incoming-booking').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('Link je kopiran. Nalepi u instaliranu aplikaciju.');}catch{window.prompt('Kopiraj ceo šifrovani link:',location.href);}};
 }
}
function parseTestJSON(){const input=window.prompt('Nalepi JSON test-zahtev. Primer: {"clientName":"Test korisnik","serviceName":"Muško šišanje","date":"2026-09-28","time":"10:00"}');if(input===null)return;let raw;try{raw=JSON.parse(input);}catch(e){throw new Error('JSON format nije ispravan.');}
  if(typeof raw!=='object'||Array.isArray(raw)||raw===null||Object.hasOwn(raw,'__proto__'))throw new Error('Test zahtev mora biti JSON objekat.');
  const s=profile().services.find(x=>x.id===raw.serviceId||x.name===raw.serviceName);
  const data={serviceId:s?.id,date:raw.date,time:raw.time,clientName:raw.clientName,phone:raw.phone||'',units:raw.units||s?.units||1,notes:raw.notes||'',source:'test-json'};
  const b=normalizeRequest(data,profile());state.bookings.push(b);persist();refresh();openDetails(b.id);toast('Test JSON zahtev učitan. Termin nije potvrđen.');
}

async function onClick(e){const btn=e.target.closest('button[data-action]');if(!btn)return;const a=btn.dataset.action;
  try{
    if(a==='hide-banner'){btn.parentElement.remove();return;}
    if(a==='new-request')return openNew();
    if(a==='new-at')return openNew(btn.dataset.date,btn.dataset.time);
    if(a==='today'||a==='prev'||a==='next'){
      stateUI.date=a==='today'?today():addDays(stateUI.date,(a==='prev'?-1:1)*(stateUI.reservationTab==='week'?7:1));refresh();return;
    }
    if(a==='choose-day'){stateUI.date=btn.dataset.date;stateUI.view='reservations';stateUI.reservationTab='day';refresh();return;}
    if(a==='filter'){stateUI.filter=btn.dataset.filter;refresh();return;}
    if(a==='settings-open'){stateUI.settingsEditor=btn.dataset.editor;refresh();return;}
    if(a==='settings-close'){stateUI.settingsEditor='';refresh();return;}
    if(a==='save-rules')return saveRules();
    if(a==='save-services')return saveServices();
    if(a==='save-profile-name')return saveProfileName();
    if(a==='view-requests'){stateUI.view='reservations';stateUI.reservationTab='requests';refresh();return;}
    if(a==='reservation-tab'){stateUI.reservationTab=btn.dataset.tab;refresh();return;}
    if(a==='home-reservations'){stateUI.view='reservations';stateUI.reservationTab=btn.dataset.tab||'requests';refresh();return;}
    if(a==='home-settings'){stateUI.view='settings';refresh();return;}
    if(a==='home-orders'){stateUI.view='orders';stateUI.orderFilter='open';refresh();return;}
    if(a==='order-filter'){stateUI.orderFilter=btn.dataset.filter;refresh();return;}
    if(a==='order-detail')return openOrderDetails(btn.dataset.id);
    if(a==='order-toggle-item')return toggleOrderItem(Number(btn.dataset.index));
    if(a==='order-accept-modified')return await acceptModifiedOrder();
    if(a==='order-status')return await changeOrderStatus(btn.dataset.status);
    if(['order-whatsapp','order-viber','order-copy'].includes(a))return shareOrder(a.slice(6));
    if(a==='detail')return openDetails(btn.dataset.id);
    if(a==='close-dialog'){btn.closest('dialog').close();return;}
    if(a==='add-service'){byId('service-list').insertAdjacentHTML('beforeend',serviceRow());return;}
    if(a==='remove-service'){if(document.querySelectorAll('.service-row').length===1)throw new Error('Mora ostati najmanje jedna usluga.');btn.closest('.service-row').remove();return;}
    if(a==='save-settings')return saveSettings();
    if(a==='export')return exportState();
    if(a==='import'){byId('backup-file').click();return;}
    if(a==='import-test')return parseTestJSON();
    if(a==='import-secure')return await promptSecureImport();
    if(a==='queue-connect')return await connectShortCode();
    if(a==='queue-sync')return await syncQueuedRequests();
    if(a==='queue-disconnect')return await disconnectSite();
    if(a==='push-enable')return await enablePush();
    if(a==='create-pairing')return await createProfilePairing();
    if(a==='copy-pairing')return await copyPairing();
    if(a==='choose-proposal')return chooseProposal(btn.dataset.date,btn.dataset.time);
    if(a==='save-daypart-proposal')return await saveDayPartProposal();
    if(['confirm-booking','save-proposal','confirm-proposal','cancel-booking','decline-booking'].includes(a))return mutateBooking(a);
    const b=reservation(stateUI.selectedId);
    if(a==='share-whatsapp'||a==='share-viber')return openChannel(b,a==='share-whatsapp'?'whatsapp':'viber');
    if(a==='share-copy'&&communicationType(b?.status))return copyText(messageFor(b,communicationType(b.status)));
    if(a==='ics'){download(`termin_${b.date}_${b.time.replace(':','-')}.ics`,'text/calendar;charset=utf-8',icsFor(profile(),b));toast('Kalendar događaj preuzet.');return;}
  }catch(err){toast(err.message||'Došlo je do greške.');}
}
async function init(){state=(await readState())||emptyPortalState();
  if(!Array.isArray(state.orders))state.orders=[];
  if(state.profiles.length){
    try{validateImport(state);}catch(e){byId('notice').textContent='Lokalni podaci su neispravni: '+e.message+' Izvezi kopiju ako je moguće.';return;}
    const activeId=activePortalProfileId(state.profiles,state.activeProfileId);
    if(state.activeProfileId!==activeId){state.activeProfileId=activeId;await persist();}
  }
  if('BroadcastChannel' in window){channel=new BroadcastChannel(CHANNEL);channel.onmessage=()=>{byId('notice').textContent='Podaci su izmenjeni u drugoj kartici. Osveži stranicu pre sledeće izmene kako ne bi prepisao novije podatke.';};}
  document.addEventListener('click',onClick);
  document.querySelectorAll('button[data-view]').forEach(b=>b.addEventListener('click',()=>{stateUI.view=b.dataset.view;refresh();}));
  byId('request-form').addEventListener('submit',createNew);
  for(const id of ['new-service','new-date','new-time','new-units'])byId(id).addEventListener('change',()=>{if(id==='new-service')byId('new-units').value=serviceOf(byId('new-service').value)?.units||1;checkNew();});
  byId('backup-file').addEventListener('change',async e=>{try{await importState(e.target.files[0]);}catch(err){toast('Uvoz nije uspeo: '+err.message);}finally{e.target.value='';}});
  if(import.meta.env.PROD && 'serviceWorker' in navigator)serviceWorkerReady=navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>null);
  refresh();
  if(profile())await handleDirectLink();
  pollTimer=setInterval(()=>syncQueuedRequests({silent:true}).catch(()=>{}),30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncQueuedRequests({silent:true}).catch(()=>{});});
  window.addEventListener('online',()=>syncQueuedRequests({silent:true}).catch(()=>{}));
  await syncQueuedRequests({silent:true});
}
init().catch(e=>{byId('notice').textContent='Greška pokretanja: '+e.message;});
