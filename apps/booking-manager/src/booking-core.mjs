// V43.1 — pure scheduling functions shared by browser and Node tests.
export const DAY_PARTS = Object.freeze({MORNING:'MORNING',AFTERNOON:'AFTERNOON',ANY:'ANY'});
export const dayPartLabel=value=>({MORNING:'Pre podne',AFTERNOON:'Posle podne',ANY:'Svejedno'})[value]||'Nije navedeno';
export const STATUS = Object.freeze({ PENDING:'pending', CONFIRMED:'confirmed', PROPOSED:'proposed', DECLINED:'declined', CANCELLED:'cancelled' });
export const DAYS = ['Pon','Uto','Sre','Čet','Pet','Sub','Ned'];
export const DEFAULT_HOURS = [
  {enabled:true,start:'09:00',end:'17:00'}, {enabled:true,start:'09:00',end:'17:00'},
  {enabled:true,start:'09:00',end:'17:00'}, {enabled:true,start:'09:00',end:'17:00'},
  {enabled:true,start:'09:00',end:'17:00'}, {enabled:true,start:'09:00',end:'14:00'},
  {enabled:false,start:'09:00',end:'14:00'},
];
export const clone = value => JSON.parse(JSON.stringify(value));
export const makeId = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const isDate = str => {
  if(!/^\d{4}-\d\d-\d\d$/.test(str || '')) return false;
  const [y,m,d] = str.split('-').map(Number);
  const x = new Date(y,m-1,d);
  return x.getFullYear()===y && x.getMonth()===m-1 && x.getDate()===d;
};
export const isTime = str => /^([01]\d|2[0-3]):[0-5]\d$/.test(str || '');
export const toMin = time => isTime(time) ? Number(time.slice(0,2))*60+Number(time.slice(3,5)) : NaN;
export const fromMin = min => `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;
export const dateOf = date => { const [y,m,d] = date.split('-').map(Number); return new Date(y,m-1,d); };
export const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const addDays = (date,n) => { const x=dateOf(date); x.setDate(x.getDate()+n); return dateKey(x); };
export const weekdayIndex = date => (dateOf(date).getDay()+6)%7;
export const formatDate = date => new Intl.DateTimeFormat('sr-RS',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(dateOf(date));
export const makeProfile = (name='Test salon') => ({
  id:makeId(), name, capacity:1, slotStep:15, buffer:0,
  hours:clone(DEFAULT_HOURS), breaks:{enabled:false,start:'12:00',end:'12:30'},
  closedDates:[], services:[
    {id:makeId(),name:'Muško šišanje',duration:30,units:1},
    {id:makeId(),name:'Žensko šišanje',duration:60,units:1},
    {id:makeId(),name:'Farbanje',duration:90,units:1},
  ]
});
export const demoState = () => { const p=makeProfile(); return {schema:1,activeProfileId:p.id,profiles:[p],bookings:[],savedAt:null}; };
export function normalizeRequest(input,profile) {
  const service = profile.services.find(s=>s.id===input.serviceId);
  if (!service) throw new Error('Izaberite uslugu.');
  const date = String(input.date || ''); const timingMode=input.timingMode==='DAY_PART'?'DAY_PART':'EXACT_TIME'; const time=timingMode==='EXACT_TIME'?String(input.time||''):''; const dayPart=timingMode==='DAY_PART'?String(input.dayPart||''):'';
  if (!isDate(date)||(timingMode==='EXACT_TIME'&&!isTime(time))||(timingMode==='DAY_PART'&&!Object.values(DAY_PARTS).includes(dayPart))) throw new Error('Unesite ispravan datum i vreme ili deo dana.');
  const name=String(input.clientName||'').trim();
  if (name.length<2||name.length>100) throw new Error('Ime klijenta mora imati 2–100 znakova.');
  const phone=String(input.phone||'').trim();
  if (phone.length>45) throw new Error('Telefon je predugačak.');
  const notes=String(input.notes||'').trim().slice(0,700);
  const units=Number(input.units||service.units||1);
  if (!Number.isInteger(units)||units<1||units>profile.capacity) throw new Error('Broj mesta/resursa prevazilazi podešeni kapacitet.');
  return {id: input.id || makeId(),profileId:profile.id,serviceId:service.id,serviceName:service.name,
    duration:service.duration, units, date,time,timingMode,dayPart,clientName:name,phone,notes,status:STATUS.PENDING,
    createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),proposal:null,source:input.source||'manual'};
}
function hoursFor(profile,date) { return profile.hours[weekdayIndex(date)]; }
export function slotCheck(profile,bookings,{date,time,duration,units=1,excludeId=null}) {
  if(!isDate(date)||!isTime(time)) return {ok:false,reason:'Neispravan datum ili vreme.'};
  if (!Number.isInteger(duration)||duration<5||duration>1440) return {ok:false,reason:'Neispravno trajanje usluge.'};
  if(!Number.isInteger(units)||units<1||units>profile.capacity) return {ok:false,reason:'Traženi kapacitet nije dostupan.'};
  if ((profile.closedDates||[]).includes(date)) return {ok:false,reason:'Neradni dan.'};
  const h=hoursFor(profile,date);
  if(!h?.enabled) return {ok:false,reason:'Zatvoreno tog dana.'};
  const start=toMin(time), end=start+duration;
  if (start<toMin(h.start)||end>toMin(h.end)) return {ok:false,reason:'Termin je van radnog vremena.'};
  const b=profile.breaks;
  if(b?.enabled && start<toMin(b.end) && end>toMin(b.start)) return {ok:false,reason:'Termin se preklapa sa pauzom.'};
  const buffer=Number(profile.buffer)||0;
  const confirmed=bookings.filter(x=>x.profileId===profile.id && x.status===STATUS.CONFIRMED && x.date===date && x.id!==excludeId);
  // A candidate is valid if at every moment during its interval, concurrent resource usage fits capacity.
  // Buffer is applied after each confirmed booking to stop back-to-back scheduling where configured.
  const points=new Set([start,end]);
  for(const x of confirmed){
    const a=toMin(x.time), z=a+Number(x.duration)+buffer;
    if (a<end && z>start){points.add(Math.max(start,a));points.add(Math.min(end,z));}
  }
  const cuts=[...points].sort((a,b)=>a-b);
  for(let i=0;i<cuts.length-1;i++){
    const mid=(cuts[i]+cuts[i+1])/2;
    const occupied=confirmed.filter(x=>toMin(x.time)<=mid && mid<toMin(x.time)+Number(x.duration)+buffer)
      .reduce((sum,x)=>sum+Number(x.units||1),0);
    if(occupied+units>profile.capacity) return {ok:false,reason:'Termin je zauzet.',conflicts:confirmed.filter(x=>toMin(x.time)<end&&toMin(x.time)+Number(x.duration)+buffer>start).map(x=>x.id)};
  }
  return {ok:true,reason:'Slobodan termin.'};
}
export function alternatives(profile,bookings,request,count=4,maxDays=14) {
  if(!isDate(request.date)||!isTime(request.time)) return [];
  const out=[]; const step=Number(profile.slotStep)||15; const after=toMin(request.time);
  for(let day=0;day<maxDays && out.length<count;day++) {
    const date=addDays(request.date,day); const h=hoursFor(profile,date);
    if(!h?.enabled||profile.closedDates?.includes(date)) continue;
    const lower=day===0 ? Math.max(after+step,toMin(h.start)) : toMin(h.start);
    const first=Math.ceil(lower/step)*step;
    for(let min=first;min+Number(request.duration)<=toMin(h.end) && out.length<count;min+=step){
      const time=fromMin(min);
      if(slotCheck(profile,bookings,{date,time,duration:request.duration,units:request.units,excludeId:request.id}).ok) out.push({date,time});
    }
  }
  return out;
}
export function weekStart(date){ const d=dateOf(date);d.setDate(d.getDate()-(d.getDay()+6)%7);return dateKey(d); }
export function formatRequest(request){return `${request.clientName} · ${request.serviceName} · ${formatDate(request.date)} u ${request.time} · ${request.duration} min`;}
export function validateImport(json){
  if(!json||json.schema!==1||!Array.isArray(json.profiles)||!Array.isArray(json.bookings)||!json.profiles.length) throw new Error('Nepoznat format rezervne kopije.');
  if(json.profiles.length>100||json.bookings.length>50000) throw new Error('Prevelika rezervna kopija.');
  const ids=new Set();
  for(const p of json.profiles){
    if(!p||typeof p.id!=='string'||typeof p.name!=='string'||!Array.isArray(p.hours)||p.hours.length!==7||!Array.isArray(p.services)) throw new Error('Oštećeni poslovni profil.');
    if(!Number.isInteger(p.capacity)||p.capacity<1||p.capacity>99) throw new Error('Oštećen kapacitet profila.');
    if(ids.has(p.id)) throw new Error('Duplirani poslovni profil.');
    ids.add(p.id);
  }
  for(const b of json.bookings){
    if(!b||typeof b.id!=='string'||!ids.has(b.profileId)||!isDate(b.date)||((b.timingMode==='DAY_PART')?!Object.values(DAY_PARTS).includes(b.dayPart):!isTime(b.time))||!Object.values(STATUS).includes(b.status)) throw new Error('Oštećen unos rezervacije.');
    if(!Number.isInteger(b.duration)||b.duration<5||b.duration>1440||!Number.isInteger(b.units)||b.units<1||b.units>99) throw new Error('Neispravno trajanje ili kapacitet rezervacije.');
  }
  return clone(json);
}
export function icsFor(business,booking){
  if(booking.status!==STATUS.CONFIRMED) throw new Error('Samo potvrđene rezervacije mogu u kalendar.');
  const time=(d,t)=>`${d.replaceAll('-','')}T${t.replace(':','')}00`;
  const start=toMin(booking.time)+Number(booking.duration);
  const endDate=start>=1440?addDays(booking.date,1):booking.date;
  const endTime=fromMin(start%1440);
  const esc=s=>String(s||'').replaceAll('\\','\\\\').replaceAll(';','\\;').replaceAll(',','\\,').replaceAll('\n','\\n').replaceAll('\r','');
  const stamp=new Date().toISOString().replaceAll('-','').replaceAll(':','').replace(/\.\d{3}/,'');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//RMC//Booking Manager V43.1//SR','CALSCALE:GREGORIAN','BEGIN:VEVENT',
    `UID:${esc(booking.id)}@rmc-booking.local`,`DTSTAMP:${stamp}`,`DTSTART:${time(booking.date,booking.time)}`,`DTEND:${time(endDate,endTime)}`,
    `SUMMARY:${esc(booking.serviceName)} — ${esc(booking.clientName)}`,`DESCRIPTION:${esc('RMC Booking Manager | '+business.name+' | '+booking.phone+' | '+booking.notes)}`,
    'END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
