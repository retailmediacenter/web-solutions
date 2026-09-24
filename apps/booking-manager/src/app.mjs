import {STATUS,DAYS,clone,makeId,makeProfile,demoState,normalizeRequest,slotCheck,alternatives,addDays,dateKey,dateOf,formatDate,weekStart,formatRequest,validateImport,icsFor,isDate,isTime,toMin,fromMin} from './booking-core.mjs';
import {whatsappUrl,viberUrl,hasWhatsAppRecipient} from './messaging.mjs';

const byId = id => document.getElementById(id);
const safe = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => dateKey(new Date());
const isoNow = () => new Date().toISOString();
const statName = {[STATUS.PENDING]:'Čeka odgovor',[STATUS.CONFIRMED]:'Potvrđeno',[STATUS.PROPOSED]:'Predlog pripremljen',[STATUS.DECLINED]:'Odbijeno',[STATUS.CANCELLED]:'Otkazano'};
const stateUI = {view:'day',date:today(),filter:'all',selectedId:null,proposal:null};
const CHANNEL='rmc-booking-local'; let channel; let state,writing=Promise.resolve(),toastTimer;

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
function profile(){return state.profiles.find(p=>p.id===state.activeProfileId)||state.profiles[0];}
function bookings(){return state.bookings.filter(x=>x.profileId===profile().id);}
function reservation(id){return state.bookings.find(x=>x.id===id && x.profileId===profile().id);}
function serviceOf(id){return profile().services.find(x=>x.id===id);}
function toast(message){const e=byId('toast');e.textContent=message;e.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('visible'),3400);}
function download(name,mime,text){const u=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
async function copyText(value){
  try{await navigator.clipboard.writeText(value);toast('Poruka kopirana. Nalepi je u Viber ili WhatsApp.');}
  catch(e){const d=document.createElement('textarea');d.value=value;d.style.position='fixed';d.style.top='-1000px';document.body.append(d);d.select();try{if(!document.execCommand('copy'))throw new Error('No copy');toast('Poruka kopirana.');}catch(e){window.prompt('Kopiraj poruku:',value);}d.remove();}
}
const summaryLine = b=>`${formatDate(b.date)} u ${b.time} · ${b.duration} min`;
function messageFor(b,type){const p=profile();const head=type==='proposed'?'PREDLOG NOVOG TERMINA':type==='declined'?'ODGOVOR NA REZERVACIJU':'POTVRDA REZERVACIJE';
  const date=type==='proposed'&&b.proposal?b.proposal.date:b.date;
  const time=type==='proposed'&&b.proposal?b.proposal.time:b.time;
  const tail=type==='proposed'?'Molimo odgovorite da li Vam termin odgovara. Termin još NIJE potvrđen.':type==='declined'?'Nažalost, nismo u mogućnosti da potvrdimo traženi termin.':'Vaš termin je potvrđen.';
  return `${head}\n${p.name}\n\n${b.clientName}\n${b.serviceName}\n${formatDate(date)} u ${time}\nTrajanje: ${b.duration} min\n\n${tail}`;
}
function shareActions(b){
  if(![STATUS.CONFIRMED,STATUS.PROPOSED].includes(b.status))return '';
  const type=b.status===STATUS.PROPOSED?'predloga':'potvrde';
  const note=hasWhatsAppRecipient(b.phone)
    ? 'WhatsApp: poruka za uneti broj. Viber može tražiti da izabereš primaoca.'
    : 'Broj nije unet u međunarodnom formatu: izaberi primaoca u WhatsAppu ili Viberu.';
  return `<div class="share-bar"><strong>Pošalji ${type} klijentu</strong>
    <div class="share-actions">
      <button type="button" class="btn share-whatsapp" data-action="share-whatsapp">WhatsApp ↗</button>
      <button type="button" class="btn share-viber" data-action="share-viber">Viber ↗</button>
      
    </div><p>${safe(note)} Poruka nije automatski poslata — proveri je i pošalji.</p></div>`;
}
function openChannel(b,channelName){
  if(!b||![STATUS.CONFIRMED,STATUS.PROPOSED].includes(b.status))throw new Error('Prvo pripremi predlog ili potvrdi rezervaciju.');
  const msg=messageFor(b,b.status===STATUS.PROPOSED?'proposed':'confirmed');
  if(channelName==='whatsapp'){
    const u=whatsappUrl(b.phone,msg);
    window.open(u,'_blank','noopener,noreferrer');
    toast('WhatsApp otvoren. Proveri primaoca i pošalji poruku.');
  }else{
    // Viber's share deep link opens the installed app when supported, but cannot
    // reliably target the recipient or prove delivery across desktop/mobile.
    window.location.href=viberUrl(msg);
    toast('Pokušaj otvaranja Vibera. Ako ne radi, koristi WhatsApp.');
  }
}
function refresh(){
  const p=profile();state.activeProfileId=p.id;
  byId('business-switch').innerHTML=state.profiles.map(x=>`<option value="${safe(x.id)}" ${x.id===p.id?'selected':''}>${safe(x.name)}</option>`).join('');
  const pending=bookings().filter(x=>x.status===STATUS.PENDING).length;
  byId('pending-count').hidden=!pending;byId('pending-count').textContent=pending;
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===stateUI.view));
  const pages={day:['Kalendar','Pregled termina i raspoloživosti.'],week:['Nedeljni pregled','Sedam dana na jednom mestu.'],requests:['Zahtevi','Primi, proveri i odgovori na rezervacije.'],settings:['Podešavanja','Radno vreme, usluge i lokalni podaci.']};
  byId('page-title').textContent=pages[stateUI.view][0];byId('page-subtitle').textContent=pages[stateUI.view][1];
  byId('main-view').innerHTML=({day:renderDay,week:renderWeek,requests:renderRequests,settings:renderSettings})[stateUI.view]();
}
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
function renderDay(){const bs=bookings().filter(b=>b.date===stateUI.date),st=runStats();const visible=bs.filter(b=>b.status===STATUS.CONFIRMED||b.status===STATUS.PENDING||b.status===STATUS.PROPOSED).sort((a,b)=>a.time.localeCompare(b.time));
  const booked=bs.filter(b=>b.status===STATUS.CONFIRMED).sort((a,b)=>a.time.localeCompare(b.time));const waiting=bs.filter(b=>b.status===STATUS.PENDING).sort((a,b)=>a.time.localeCompare(b.time));
  return `${toolbar()}<div class="stat-grid"><div class="stat-card accent"><div class="label">Potvrđeno tog dana</div><div class="value">${st.confirmed}</div><div class="foot">Zakazani termini</div></div><div class="stat-card"><div class="label">Čekaju odgovor</div><div class="value">${st.pending}</div><div class="foot">Ukupno otvorenih zahteva</div></div><div class="stat-card"><div class="label">Potvrđeno ove nedelje</div><div class="value">${st.week}</div><div class="foot">Kalendar: ${safe(profile().name)}</div></div></div>
  <div class="columns"><section class="panel"><div class="panel-head"><h2>Termini za izabrani dan</h2><span class="tiny-label">${visible.length} ukupno</span></div><div class="panel-body">${visible.length?visible.map(appointmentCard).join(''):'<div class="empty"><div class="empty-icon">▤</div>Za ovaj dan nema rezervacija.<br>Dodaj test zahtev da proverimo kalendar.</div>'}</div></section>
  <section class="panel"><div class="panel-head"><h2>Sledeći slobodni termini</h2><span class="tiny-label">TEST</span></div><div class="panel-body"><p class="hint">Predlog za prvu uslugu (${profile().services[0]?safe(profile().services[0].duration)+' min':'dodaj uslugu'}). Nije javno prikazana raspoloživost.</p><div class="slot-chips">${freeSuggestions()||'<span class="hint">Nema dostupnih termina tog dana.</span>'}</div><div class="helper-box">Zahtev ne blokira termin. Samo potvrđena rezervacija zauzima kapacitet kalendara.</div></div></section></div>
  ${(waiting.length?`<div class="panel" style="margin-top:19px"><div class="panel-head"><h2>Potrebna potvrda</h2><button class="text-btn" data-action="view-requests">Svi zahtevi →</button></div><div class="panel-body">${waiting.map(appointmentCard).join('')}</div></div>`:'')}`;
}
function renderWeek(){const start=weekStart(stateUI.date),p=profile();return `${toolbar(true)}<div class="panel"><div class="panel-head"><h2>Nedelja</h2><span class="tiny-label">KLIK ZA DAN</span></div><div class="panel-body"><div class="week-grid">${Array.from({length:7},(_,i)=>{const d=addDays(start,i),arr=bookings().filter(b=>b.date===d),confirmed=arr.filter(b=>b.status===STATUS.CONFIRMED).length,pending=arr.filter(b=>b.status===STATUS.PENDING).length,day=p.hours[(dateOf(d).getDay()+6)%7];return `<button class="day-card ${d===stateUI.date?'selected':''}" data-action="choose-day" data-date="${d}"><div class="day-name">${DAYS[i]}</div><div class="day-num">${Number(d.slice(-2))}</div>${!day?.enabled||p.closedDates?.includes(d)?'<span class="closed">Neradni dan</span>':`<span class="week-pill">${confirmed} potvrđeno</span>${pending?`<span class="week-pill secondary">${pending} čeka</span>`:''}`}</button>`;}).join('')}</div></div></div><div class="helper-box">Nedelja prikazuje potvrđene rezervacije i zahteve. Detalje proveravaš u dnevnom prikazu.</div>`;}
function renderRequests(){let bs=bookings().sort((a,b)=>{const rank={pending:0,proposed:1,confirmed:2,declined:3,cancelled:4};return rank[a.status]-rank[b.status]||b.createdAt.localeCompare(a.createdAt);});
  if(stateUI.filter!=='all')bs=bs.filter(b=>b.status===stateUI.filter);
  return `<div class="toolbar"><strong>${bs.length} zahteva</strong><button class="btn btn-light" data-action="import-test">↥ Unesi test JSON</button></div><div class="filter-bar">${[['all','Svi'],['pending','Čekaju'],['confirmed','Potvrđeni'],['proposed','Predlozi'],['cancelled','Otkazani'],['declined','Odbijeni']].map(([id,label])=>`<button class="filter ${stateUI.filter===id?'active':''}" data-action="filter" data-filter="${id}">${label}</button>`).join('')}</div><div class="request-grid">${bs.map(b=>`<article class="request-card"><div class="request-card-head"><span class="tag ${safe(b.status)}">${safe(statName[b.status])}</span><span class="tiny-label">${safe(b.source==='manual'?'RUČNI UNOS':b.source==='test-json'?'TEST JSON':'ZAHTEV')}</span></div><h3>${safe(b.clientName)}</h3><p>${safe(b.serviceName)}<br>${safe(summaryLine(b))}</p>${b.proposal?`<p style="color:#2d8e86">Predlog: ${safe(formatDate(b.proposal.date))} u ${safe(b.proposal.time)}</p>`:''}<div class="request-card-bottom"><small>${safe(b.phone||'Bez telefona')}</small><button class="tiny" data-action="detail" data-id="${safe(b.id)}">Otvori →</button></div></article>`).join('')||'<div class="panel empty">Nema zahteva za izabrani filter.</div>'}</div>`;}
function renderSettings(){const p=profile();return `<div class="toolbar"><strong>Poslovni profil</strong><button class="btn btn-light" data-action="add-profile">＋ Nova firma</button></div>
<div class="panel"><div class="setting-group"><h3>Osnovna podešavanja</h3><div class="form-grid"><label>Naziv firme<input id="set-name" value="${safe(p.name)}" maxlength="100"></label><label>Istovremeni kapacitet<input type="number" id="set-capacity" min="1" max="99" value="${p.capacity}"></label><label>Korak termina<select id="set-slot">${[15,30,60].map(n=>`<option value="${n}" ${p.slotStep===n?'selected':''}>${n} minuta</option>`).join('')}</select></label><label>Pauza između potvrđenih rezervacija<select id="set-buffer">${[0,5,10,15,30,60].map(n=>`<option value="${n}" ${p.buffer===n?'selected':''}>${n} minuta</option>`).join('')}</select></label></div><p class="hint" style="margin:12px 0 0">Kapacitet 1 = jedan frizer / jedno radno mesto. Restorani i višestruki resursi zahtevaju pažljivo podešavanje; V43.1 ne upravlja različitim osobljem ili stolovima.</p></div>
<div class="setting-group"><h3>Radno vreme</h3><div class="hours-grid">${DAYS.map((label,i)=>{const x=p.hours[i];return `<div class="hours-row" data-day="${i}"><label>${label}</label><label class="checkbox-inline"><input type="checkbox" data-field="enabled" ${x.enabled?'checked':''}> Radi</label><input class="field" type="time" data-field="start" value="${safe(x.start)}" aria-label="${label} od"><input class="field" type="time" data-field="end" value="${safe(x.end)}" aria-label="${label} do"></div>`;}).join('')}</div></div>
<div class="setting-group"><h3>Pauza i neradni dani</h3><div class="form-grid"><label class="checkbox-inline"><input id="set-break-enabled" type="checkbox" ${p.breaks?.enabled?'checked':''}> Uključi dnevnu pauzu</label><span></span><label>Pauza od<input id="set-break-start" type="time" value="${safe(p.breaks?.start||'12:00')}"></label><label>Pauza do<input id="set-break-end" type="time" value="${safe(p.breaks?.end||'12:30')}"></label></div><label style="margin-top:15px">Posebni neradni datumi (YYYY-MM-DD, odvojeni zarezom)<input id="set-closed" value="${safe((p.closedDates||[]).join(', '))}" placeholder="2026-12-31, 2027-01-01"></label></div>
<div class="setting-group"><div class="section-title"><h3>Usluge i trajanje</h3><button class="text-btn" data-action="add-service">＋ Dodaj uslugu</button></div><div class="hours-grid" id="service-list">${p.services.map(s=>serviceRow(s)).join('')}</div><p class="hint" style="margin:13px 0 0">Trajanje se snima uz svaki zahtev. Naknadna izmena usluge ne menja već primljene rezervacije.</p></div>
<div class="settings-actions"><button class="btn btn-primary" data-action="save-settings">Sačuvaj podešavanja</button><button class="btn btn-light" data-action="export">↧ Izvezi rezervnu kopiju</button><button class="btn btn-light" data-action="import">↥ Vrati kopiju</button></div></div>
<div class="helper-box">Podaci su u lokalnoj bazi ovog browsera/instalirane aplikacije. Nisu automatski dostupni u Viber browseru, na drugom telefonu ili posle brisanja podataka browsera. Redovno izvozi kopiju.</div>`;}
function serviceRow(s={id:makeId(),name:'',duration:30,units:1}){return `<div class="service-row" data-service-id="${safe(s.id)}"><input class="field" data-field="name" maxlength="90" placeholder="Naziv usluge" value="${safe(s.name)}" aria-label="Naziv usluge"><input class="field" data-field="duration" type="number" min="5" max="1440" step="5" value="${s.duration}" aria-label="Trajanje u minutima"><input class="field" data-field="units" type="number" min="1" max="99" value="${s.units||1}" aria-label="Potrebni resursi"><button class="service-remove" data-action="remove-service" title="Ukloni uslugu" aria-label="Ukloni uslugu">×</button></div>`;}
function saveSettings(){const p=profile();const name=byId('set-name').value.trim(),capacity=Number(byId('set-capacity').value);if(name.length<2||name.length>100)throw new Error('Unesi naziv firme (2–100 znakova).');if(!Number.isInteger(capacity)||capacity<1||capacity>99)throw new Error('Kapacitet mora biti od 1 do 99.');
  const hours=[...document.querySelectorAll('.hours-row')].map(row=>{const enabled=row.querySelector('[data-field="enabled"]').checked,start=row.querySelector('[data-field="start"]').value,end=row.querySelector('[data-field="end"]').value;if(enabled&&(!isTime(start)||!isTime(end)||toMin(start)>=toMin(end)))throw new Error(`Radno vreme: proveri dan ${DAYS[Number(row.dataset.day)]}.`);return {enabled,start,end};});
  const services=[...document.querySelectorAll('.service-row')].map(row=>{const name=row.querySelector('[data-field="name"]').value.trim(),duration=Number(row.querySelector('[data-field="duration"]').value),units=Number(row.querySelector('[data-field="units"]').value);if(!name||name.length>90||!Number.isInteger(duration)||duration<5||duration>1440||!Number.isInteger(units)||units<1||units>capacity)throw new Error('Usluge: proveri naziv, trajanje (5–1440 min) i kapacitet.');return {id:row.dataset.serviceId,name,duration,units};});
  if(!services.length)throw new Error('Potrebna je bar jedna usluga.');
  const b={enabled:byId('set-break-enabled').checked,start:byId('set-break-start').value,end:byId('set-break-end').value};if(b.enabled&&(!isTime(b.start)||!isTime(b.end)||toMin(b.start)>=toMin(b.end)))throw new Error('Pauza mora imati ispravan početak i kraj.');
  const closed=byId('set-closed').value.split(',').map(x=>x.trim()).filter(Boolean);if(closed.some(d=>!isDate(d)))throw new Error('Neradni datumi moraju biti u formatu YYYY-MM-DD.');
  Object.assign(p,{name,capacity,slotStep:Number(byId('set-slot').value),buffer:Number(byId('set-buffer').value),hours,services,breaks:b,closedDates:[...new Set(closed)]});
  persist();refresh();toast('Podešavanja sačuvana.');
}
function openNew(date=stateUI.date,time='10:00'){
  const p=profile();byId('request-form').reset();byId('new-service').innerHTML=p.services.map(s=>`<option value="${safe(s.id)}">${safe(s.name)} · ${s.duration} min</option>`).join('');
  byId('new-date').value=date;byId('new-time').value=time;byId('new-units').max=p.capacity;byId('new-units').value=p.services[0]?.units||1;checkNew();byId('request-dialog').showModal();
}
function checkNew(){const p=profile(),s=serviceOf(byId('new-service').value),el=byId('new-slot-feedback');if(!s)return;
  const r=slotCheck(p,bookings(),{date:byId('new-date').value,time:byId('new-time').value,duration:s.duration,units:Number(byId('new-units').value)});
  el.className=`feedback ${r.ok?'':'bad'}`;el.textContent=r.ok?'✓ Termin je trenutno slobodan. Potvrda je ipak potrebna.':`! ${r.reason} Zahtev možeš sačuvati, pa ponuditi alternativu.`;
}
function createNew(e){e.preventDefault();try{const p=profile();const fd=new FormData(e.currentTarget);const b=normalizeRequest(Object.fromEntries(fd),p);if(state.bookings.some(x=>x.id===b.id))throw new Error('Ovaj zahtev već postoji.');state.bookings.push(b);persist();byId('request-dialog').close();stateUI.view='requests';refresh();openDetails(b.id);toast('Zahtev sačuvan. Termin još nije potvrđen.');}catch(e){toast(e.message);}}
function detailGrid(b){return `<div class="detail-grid"><div class="detail-cell"><small>Klijent</small><strong>${safe(b.clientName)}</strong></div><div class="detail-cell"><small>Telefon</small><strong>${safe(b.phone||'Nije unet')}</strong></div><div class="detail-cell"><small>Usluga</small><strong>${safe(b.serviceName)}</strong></div><div class="detail-cell"><small>Traženi termin</small><strong>${safe(formatDate(b.date))}, ${safe(b.time)}</strong></div><div class="detail-cell"><small>Trajanje / resursi</small><strong>${safe(b.duration)} min / ${safe(b.units)}</strong></div><div class="detail-cell"><small>Status</small><strong>${safe(statName[b.status])}</strong></div></div>${b.notes?`<div class="detail-cell"><small>Napomena</small><strong style="white-space:pre-wrap;font-weight:500">${safe(b.notes)}</strong></div>`:''}`;}
function openDetails(id){const b=reservation(id);if(!b)return;stateUI.selectedId=id;stateUI.proposal=b.proposal?clone(b.proposal):null;
  const original=slotCheck(profile(),bookings(),{...b,excludeId:b.id});const options=alternatives(profile(),bookings(),b,4,14);
  byId('booking-details').innerHTML=`<div class="dialog-head"><div><div class="eyebrow">ZAHTEV / ${safe(b.source==='manual'?'RUČNI UNOS':'TEST')}</div><h2>${safe(b.clientName)}</h2></div><button class="close" data-action="close-dialog" aria-label="Zatvori">×</button></div>
  <div class="dialog-body">${detailGrid(b)}
  ${b.status===STATUS.CONFIRMED?'<div class="success">✓ Termin zauzima kapacitet u lokalnom kalendaru.</div>':b.status===STATUS.CANCELLED||b.status===STATUS.DECLINED?'<div class="warning">Ovaj zahtev je zatvoren i ne zauzima termin.</div>':`<div class="${original.ok?'success':'warning'}">${original.ok?'✓ Traženi termin je trenutno slobodan.':'! '+safe(original.reason)+' Možeš ponuditi prvi slobodan termin.'}</div>`}
  ${(b.status===STATUS.PENDING||b.status===STATUS.PROPOSED)?`<div class="proposal-box"><h3>Predloži drugi termin</h3><div class="proposal-pills">${(b.proposal?[b.proposal]:[]).concat(options.filter(x=>!b.proposal||x.date!==b.proposal.date||x.time!==b.proposal.time)).map(x=>`<button data-action="choose-proposal" data-date="${x.date}" data-time="${x.time}" class="${stateUI.proposal?.date===x.date&&stateUI.proposal?.time===x.time?'selected':''}">${safe(formatDate(x.date))}<br><b>${x.time}</b></button>`).join('')||'<span class="hint">Nema alternativa u narednih 14 dana.</span>'}</div><p>Predloženi termin se ne rezerviše dok ne stigne potvrda klijenta.</p></div>`:''}
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
function chooseProposal(date,time){const b=reservation(stateUI.selectedId),r=slotCheck(profile(),bookings(),{date,time,duration:b.duration,units:b.units,excludeId:b.id});if(!r.ok){toast(r.reason);return;}
  stateUI.proposal={date,time};byId('booking-dialog').querySelectorAll('[data-action="choose-proposal"]').forEach(el=>el.classList.toggle('selected',el.dataset.date===date&&el.dataset.time===time));const button=byId('booking-dialog').querySelector('[data-action="save-proposal"]');if(button)button.disabled=false;
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
function exportState(){download(`RMC_BOOKING_BACKUP_${today()}.json`,'application/json',JSON.stringify({...state,savedAt:isoNow()},null,2));toast('Kopija preuzeta. Sačuvaj je na sigurnom mestu.');}
async function importState(file){if(!file)return;if(file.size>15*1024*1024)throw new Error('Datoteka je prevelika.');const contents=await file.text(),parsed=validateImport(JSON.parse(contents));if(!window.confirm('UVOZ ZAMENJUJE SVE postojeće lokalne podatke, uključujući sve firme i rezervacije. Nastaviti?'))return;
  state=parsed;if(!state.profiles.find(x=>x.id===state.activeProfileId))state.activeProfileId=state.profiles[0].id;await persist();refresh();toast('Rezervna kopija uspešno učitana.');
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
      stateUI.date=a==='today'?today():addDays(stateUI.date,(a==='prev'?-1:1)*(stateUI.view==='week'?7:1));refresh();return;
    }
    if(a==='choose-day'){stateUI.date=btn.dataset.date;stateUI.view='day';refresh();return;}
    if(a==='filter'){stateUI.filter=btn.dataset.filter;refresh();return;}
    if(a==='view-requests'){stateUI.view='requests';refresh();return;}
    if(a==='detail')return openDetails(btn.dataset.id);
    if(a==='close-dialog'){btn.closest('dialog').close();return;}
    if(a==='add-profile'){
      const name=window.prompt('Naziv nove firme / radnog kalendara:','Nova firma');if(!name)return;if(name.trim().length<2||name.trim().length>100)throw new Error('Naziv mora imati 2–100 znakova.');
      const p=makeProfile(name.trim());p.services=[{id:makeId(),name:'Osnovna usluga',duration:30,units:1}];state.profiles.push(p);state.activeProfileId=p.id;await persist();refresh();toast('Novi nezavisni kalendar je napravljen.');return;
    }
    if(a==='add-service'){byId('service-list').insertAdjacentHTML('beforeend',serviceRow());return;}
    if(a==='remove-service'){if(document.querySelectorAll('.service-row').length===1)throw new Error('Mora ostati najmanje jedna usluga.');btn.closest('.service-row').remove();return;}
    if(a==='save-settings')return saveSettings();
    if(a==='export')return exportState();
    if(a==='import'){byId('backup-file').click();return;}
    if(a==='import-test')return parseTestJSON();
    if(a==='choose-proposal')return chooseProposal(btn.dataset.date,btn.dataset.time);
    if(['confirm-booking','save-proposal','confirm-proposal','cancel-booking','decline-booking'].includes(a))return mutateBooking(a);
    const b=reservation(stateUI.selectedId);
    if(a==='share-whatsapp'||a==='share-viber')return openChannel(b,a==='share-whatsapp'?'whatsapp':'viber');
    if(a==='share-copy'&&[STATUS.CONFIRMED,STATUS.PROPOSED].includes(b?.status))return copyText(messageFor(b,b.status===STATUS.PROPOSED?'proposed':'confirmed'));
    if(a==='ics'){download(`termin_${b.date}_${b.time.replace(':','-')}.ics`,'text/calendar;charset=utf-8',icsFor(profile(),b));toast('Kalendar događaj preuzet.');return;}
  }catch(err){toast(err.message||'Došlo je do greške.');}
}
async function init(){state=(await readState())||demoState();
  try{validateImport(state);}catch(e){byId('notice').textContent='Lokalni podaci su neispravni: '+e.message+' Izvezi kopiju ako je moguće.';state=demoState();}
  if('BroadcastChannel' in window){channel=new BroadcastChannel(CHANNEL);channel.onmessage=()=>{byId('notice').textContent='Podaci su izmenjeni u drugoj kartici. Osveži stranicu pre sledeće izmene kako ne bi prepisao novije podatke.';};}
  document.addEventListener('click',onClick);
  document.querySelectorAll('button[data-view]').forEach(b=>b.addEventListener('click',()=>{stateUI.view=b.dataset.view;refresh();}));
  byId('business-switch').addEventListener('change',e=>{state.activeProfileId=e.target.value;persist();refresh();});
  byId('request-form').addEventListener('submit',createNew);
  for(const id of ['new-service','new-date','new-time','new-units'])byId(id).addEventListener('change',()=>{if(id==='new-service')byId('new-units').value=serviceOf(byId('new-service').value)?.units||1;checkNew();});
  byId('backup-file').addEventListener('change',async e=>{try{await importState(e.target.files[0]);}catch(err){toast('Uvoz nije uspeo: '+err.message);}finally{e.target.value='';}});
  if(import.meta.env.PROD && 'serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
  refresh();
}
init().catch(e=>{byId('notice').textContent='Greška pokretanja: '+e.message;});
