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
const date=form.elements.namedItem('date');if(date)date.min=todayLocal();
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
 if(site.bookingTransport&&site.booking?.enabled&&entry.date&&entry.time){
  const status=$('copyRequestStatus');
  $('requestMessage').textContent=message;
  $('viberRequest').hidden=true;$('waRequest').hidden=true;
  if(!entry.date||!entry.time){status.textContent='Za slanje rezervacije izaberite datum i vreme.';dialog.showModal();return;}
  try{
   if(!window.RMCBookingSubmit)throw new Error('Nedostaje modul za slanje rezervacija.');
   const extra=keys.filter(k=>!['service','date','time','name','phone'].includes(k)&&String(entry[k]||'').trim()).map(k=>names[k]+': '+entry[k]).join('; ');
   const result=await window.RMCBookingSubmit.send(site.bookingTransport,{clientName:entry.name,phone:entry.phone,serviceName:entry.service||entry.eventType||'',date:entry.date,time:entry.time,note:extra});
   status.textContent='Zahtev je poslat firmi. Referenca: '+result.requestId+'. Termin još nije potvrđen.';
   dialog.showModal();return;
  }catch(err){status.textContent='Zahtev NIJE potvrđeno poslat: '+err.message+' Kontaktirajte firmu telefonom ako je hitno.';dialog.showModal();return;}
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
 $('copyRequestStatus').textContent=message.includes('#rmb=')?'Link sadrži šifrovane podatke. Na Viberu proveri da li se prenela CELA poruka; ako nije, upotrebi WhatsApp ili Kopiraj zahtev. Termin još nije potvrđen.':'';dialog.showModal();
});
if(date)date.addEventListener('change',()=>date.setCustomValidity(''));
})();
