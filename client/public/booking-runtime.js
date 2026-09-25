/* V41.5 service booking client. Data-driven. No Advisor or registry here. */
(()=>{
'use strict';
const data=document.getElementById('bookingData');if(!data)return;
let site;try{site=JSON.parse(data.textContent);}catch{return;}
const $=id=>document.getElementById(id);
const form=$('requestForm'),dialog=$('requestDialog');
if(!form||!dialog)return;
const names={service:'Usluga',eventType:'Tip događaja',partySize:'Broj osoba',locationMode:'Način razgovora',
  vehicle:'Vozilo',issue:'Opis',location:'Lokacija',destination:'Odredište',date:'Željeni datum',time:'Željeno vreme',daypart:'Doba dana',name:'Ime',phone:'Telefon',note:'Napomena'};
function todayLocal(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
// Authoritative offering list comes from Node's public booking configuration.
// Hydrate the control at runtime as a second guard against stale/interpolated
// HTML in Preview. The same logic runs in the downloadable standalone site.
const servicePicker=form.elements.namedItem('service');
const options=Array.isArray(site.booking?.offerings)?site.booking.offerings
  .filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()):[];
if(servicePicker && options.length){
  const previous=servicePicker.value;
  const unique=[...new Set(options)];
  const nodes=unique.map(value=>new Option(value,value));
  if(unique.length>1)nodes.unshift(new Option('Izaberite uslugu',''));
  servicePicker.replaceChildren(...nodes);
  if(unique.includes(previous))servicePicker.value=previous;
  else servicePicker.value=unique.length===1?unique[0]:'';
}
const serviceDefinitions=Array.isArray(site.booking?.services)?site.booking.services.filter(item=>item&&typeof item.id==='string'&&typeof item.name==='string'):[];
const serviceIdFor=name=>serviceDefinitions.find(item=>item.name===name)?.id||'';
const date=form.elements.namedItem('date');if(date)date.min=todayLocal();
const apiBooking=Boolean(site.bookingTransport&&site.booking?.enabled);
const dayPartCodes=Object.freeze({Prepodne:'MORNING',Popodne:'AFTERNOON','Bilo kada':'ANY'});
let retryRequest=null;
const clearRetry=()=>{retryRequest=null;};
form.addEventListener('input',clearRetry);form.addEventListener('change',clearRetry);
const showDialog=()=>{if(!dialog.open)dialog.showModal();};
function setApiState(state,{reservationCode='',error=''}={}){
 const sending=$('bookingSubmitSending'),success=$('bookingSubmitSuccess'),failed=$('bookingSubmitError');
 if(!sending||!success||!failed)return;
 sending.hidden=state!=='sending';success.hidden=state!=='success';failed.hidden=state!=='error';
 if(state==='success')$('bookingReservationCode').textContent=reservationCode;
 if(state==='error')$('bookingSubmitErrorText').textContent=error;
}
function setSubmitting(value){const submit=form.querySelector('[type="submit"]');if(submit){submit.disabled=value;submit.setAttribute('aria-busy',String(value));}}
function jump(target){if(!target)return;const sticky=document.querySelector('.site-header')?.offsetHeight||0;
 const top=window.scrollY+target.getBoundingClientRect().top-sticky-12;
 window.scrollTo({top:Math.max(0,top),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
document.addEventListener('click',e=>{
 const anchor=e.target.closest('a[href^="#"]');if(anchor){const dest=document.getElementById(anchor.getAttribute('href').slice(1));if(dest){e.preventDefault();
 // A pre-fix card may still contain a literal JS template string.
 // Recover from its visible heading instead of injecting source code into a select.
 const rawService=anchor.dataset.service;
 const service=rawService && !rawService.includes('${') ? rawService
   : anchor.closest('.service-card')?.querySelector('h3')?.textContent?.trim();
 if(service&&form.elements.namedItem('service')){
   const picker=form.elements.namedItem('service');
   // Custom visual cards do not invent booking offerings: fall back to the
   // preset when a card label is not a selectable service option.
   if(![...picker.options].some(o=>o.value===service))picker.add(new Option(service,service));
   picker.value=service;
 }
 jump(dest);return;
 }}
 if(e.target.closest('[data-close]'))dialog.close();
 if(e.target.closest('[data-booking-retry]'))form.requestSubmit();
 if(e.target.closest('#copyRequest'))void copyRequest();
 if(e.target.closest('#viberRequest'))void copyRequest();
});
let message='';
async function copyRequest(){let ok=false;
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);ok=true;}}catch{}
 if(!ok){const t=document.createElement('textarea');t.value=message;t.style.position='fixed';t.style.left='-9999px';document.body.append(t);t.select();try{ok=document.execCommand('copy');}catch{}t.remove();}
 $('copyRequestStatus').textContent=ok?'Zahtev je kopiran.':'Označite tekst zahteva i kopirajte ga ručno.';
}
function viberUrl(text){const linked=text.includes('#rmb=');const clipped=linked?text:(text.length<=190?text:text.slice(0,130).replace(/\s+\S*$/,'')+'… (nalepite ceo kopirani zahtev)');return 'viber://forward?text='+encodeURIComponent(clipped);}
function waUrl(text){const phone=String(site.contact?.phone||'').replace(/\D/g,'');return 'https://wa.me/'+phone+'?text='+encodeURIComponent(text);}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!form.reportValidity())return;
 const entry=Object.fromEntries(new FormData(form).entries());
 if(entry.date&&entry.date<todayLocal()){
  date?.setCustomValidity('Izaberite današnji ili budući datum.');form.reportValidity();return;
 }if(date)date.setCustomValidity('');
 const kind=site.booking?.enabled?site.booking.mode:'contact';
 const title=kind==='reservation'?'zahtev za rezervaciju':kind==='consultation'?'zahtev za konsultaciju':kind==='appointment'||kind==='request-slot'?'zahtev za termin':'kontakt upit';
 const keys=['service','eventType','partySize','locationMode','vehicle','issue','location','destination','date','time','daypart','name','phone','note'];
 message=['Pozdrav, želim da pošaljem '+title+' firmi '+site.business.name+':',
   ...keys.filter(k=>String(entry[k]||'').trim()).map(k=>names[k]+': '+String(entry[k]).trim()),
   site.booking?.enabled?'Molim vas da potvrdite da li je željeni termin dostupan.':'Molim vas da mi odgovorite kada budete u mogućnosti.'].join('\n');
 if(apiBooking){
  const timingMode=site.booking?.mode==='request-slot'?'DAY_PART':'EXACT_TIME';
  if(!entry.date||(timingMode==='EXACT_TIME'&&!entry.time)||(timingMode==='DAY_PART'&&!entry.daypart)){setApiState('error',{error:timingMode==='DAY_PART'?'Izaberite datum i željeno doba dana.':'Za slanje rezervacije izaberite datum i vreme.'});showDialog();return;}
  const extra=keys.filter(k=>!['service','date','time','name','phone'].includes(k)&&String(entry[k]||'').trim()).map(k=>names[k]+': '+entry[k]).join('; ');
  const serviceName=entry.service||entry.eventType||'',serviceId=serviceIdFor(serviceName);
  const fingerprint=JSON.stringify({serviceId,serviceName,date:entry.date,time:entry.time,name:entry.name,phone:entry.phone,note:extra});
  if(!retryRequest||retryRequest.fingerprint!==fingerprint)retryRequest={fingerprint,requestId:crypto.randomUUID()};
  setSubmitting(true);setApiState('sending');showDialog();
  try{
   if(!window.RMCBookingSubmit)throw new Error('Nedostaje modul za slanje rezervacija.');
   const result=await window.RMCBookingSubmit.send(site.bookingTransport,{requestId:retryRequest.requestId,clientName:entry.name,phone:entry.phone,serviceId,serviceName,date:entry.date,time:timingMode==='EXACT_TIME'?entry.time:'',timingMode,dayPart:timingMode==='DAY_PART'?(dayPartCodes[entry.daypart]||''):'',note:extra});
   setApiState('success',{reservationCode:result.reservationCode});
  }catch(err){setApiState('error',{error:'Zahtev nije poslat. '+err.message});}
  finally{setSubmitting(false);}return;
 }
 $('viberRequest').hidden=false;$('waRequest').hidden=false;
 if(site.bookingManager?.token&&site.booking?.enabled&&entry.date&&entry.time){
  try{
   if(!window.RMCBookingLink)throw new Error('Modul za šifrovanje nije učitan.');
   const extra=keys.filter(k=>!['service','date','time','name','phone'].includes(k)&&String(entry[k]||'').trim()).map(k=>names[k]+': '+entry[k]).join('; ');
   const request={v:1,requestId:crypto.randomUUID(),clientName:entry.name,phone:entry.phone,serviceName:entry.service,date:entry.date,time:entry.time,units:1,notes:extra.slice(0,650)};
   const link=await window.RMCBookingLink.create(request,site.bookingManager.token,site.bookingManager.url);
   message+='\n\nOTVORI REZERVACIJU U BOOKING MANAGERU:\n'+link;
  }catch(err){$('copyRequestStatus').textContent='Nije moguće pripremiti Booking link: '+err.message+'. Pokušaj ponovo putem HTTPS-a ili kontaktiraj firmu.';dialog.showModal();$('requestMessage').textContent=message; $('viberRequest').removeAttribute('href');$('waRequest').removeAttribute('href');return;}
 }
 $('requestMessage').textContent=message;
 $('viberRequest').href=viberUrl(message);$('waRequest').href=waUrl(message);
 $('copyRequestStatus').textContent=message.includes('#rmb=')?'Link sadrži šifrovane podatke. Na Viberu proveri da li se prenela CELA poruka; ako nije, upotrebi WhatsApp ili Kopiraj zahtev. Termin još nije potvrđen.':'';showDialog();
});
if(date)date.addEventListener('change',()=>date.setCustomValidity(''));
})();
